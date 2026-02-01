import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}
// src/modules/branch/branch.service.ts
async create(createBranchDto: CreateBranchDto) {
  // 👇 Loại bỏ id nếu nó lỡ lọt qua màng lọc từ Frontend gửi lên
  const { id, ...cleanData } = createBranchDto as any;

  return this.prisma.$transaction(async (tx) => {
    // 1. Tạo Chi nhánh (Để DB tự quản lý việc sinh ID mới)
    const branch = await tx.branch.create({
      data: cleanData, 
    });

    // 2. Tạo thiết bị với hậu tố ngẫu nhiên để tránh trùng ID Device
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
    const deviceId = `CAM_${branch.id}_${randomSuffix}`;
    
    await tx.device.create({
      data: {
        id: deviceId,
        name: `AI Gate Scanner - ${branch.name}`,
        type: 'CAMERA',
        branchId: branch.id,
      }
    });

    return branch;
  });
}

  // 2. LẤY DANH SÁCH KÈM DEVICES
  async findAll() {
    return this.prisma.branch.findMany({
      where: { deletedAt: null },
      include: {
        devices: {
          where: { deletedAt: null } 
        },
        _count: {
          select: { rooms: { where: { deletedAt: null } } } 
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. XEM CHI TIẾT
  async findOne(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: { 
        devices: { where: { deletedAt: null } }, 
        rooms: { where: { deletedAt: null } } 
      },
    });

    if (!branch) {
      throw new NotFoundException(`Cơ sở ID ${id} không tồn tại hoặc đã bị xóa`);
    }

    return branch;
  }

  // 4. CẬP NHẬT
  async update(id: number, updateBranchDto: UpdateBranchDto) {
    await this.findOne(id); 

    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  // 5. XÓA MỀM (Sử dụng Transaction để đồng bộ dữ liệu)
  async remove(id: number) {
    const branch = await this.findOne(id);

    const occupiedRooms = await this.prisma.room.count({
      where: { branchId: id, status: 'OCCUPIED', deletedAt: null }
    });

    if (occupiedRooms > 0) {
      throw new BadRequestException(`Không thể xóa vì còn ${occupiedRooms} phòng đang có khách!`);
    }

    return this.prisma.$transaction(async (prisma) => {
      const now = new Date();

      // Xóa mềm Phòng
      await prisma.room.updateMany({
        where: { branchId: id, deletedAt: null },
        data: { deletedAt: now }
      });

      // Xóa mềm Thiết bị
      await prisma.device.updateMany({
        where: { branchId: id, deletedAt: null },
        data: { deletedAt: now }
      });

      // Xóa mềm Chi nhánh
      return prisma.branch.update({
        where: { id },
        data: { deletedAt: now }, 
      });
    });
  }

  // 6. THÙNG RÁC
  async findDeleted() {
    return this.prisma.branch.findMany({
      where: { deletedAt: { not: null } },
      include: { devices: true }, 
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 7. KHÔI PHỤC (Restore đồng bộ)
  async restore(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: { not: null } }
    });
    if (!branch) throw new NotFoundException('Không tìm thấy trong thùng rác');

    return this.prisma.$transaction(async (prisma) => {
      const restoredBranch = await prisma.branch.update({
        where: { id },
        data: { deletedAt: null },
      });

      await prisma.room.updateMany({
        where: { branchId: id, deletedAt: { not: null } },
        data: { deletedAt: null }
      });

      await prisma.device.updateMany({
        where: { branchId: id, deletedAt: { not: null } },
        data: { deletedAt: null }
      });

      return restoredBranch;
    });
  }

  // 8. XÓA VĨNH VIỄN (Hard Delete kèm dọn rác quan hệ triệt để)
  async hardDelete(id: number) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Chi nhánh không tồn tại');

    return this.prisma.$transaction(async (prisma) => {
        // Xóa sạch lịch sử ra vào của các thiết bị thuộc chi nhánh này trước
        await prisma.accessLog.deleteMany({ 
          where: { device: { branchId: id } } 
        });
        
        // Xóa sạch thiết bị, phòng và chi nhánh
        await prisma.device.deleteMany({ where: { branchId: id } });
        await prisma.room.deleteMany({ where: { branchId: id } });
        
        return prisma.branch.delete({ where: { id } });
    });
  }
}