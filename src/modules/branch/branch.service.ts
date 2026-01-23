import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo mới
  async create(createBranchDto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: createBranchDto,
    });
  }

  // 2. Lấy danh sách (Lọc xóa mềm và đếm số lượng phòng)
  async findAll() {
    return this.prisma.branch.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { rooms: { where: { deletedAt: null } } } // Đếm số phòng chưa bị xóa
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Xem chi tiết
  async findOne(id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      include: { 
        rooms: { 
          where: { deletedAt: null } // Chỉ lấy các phòng chưa bị xóa
        } 
      },
    });

    if (!branch) {
      throw new NotFoundException(`Khu trọ với ID ${id} không tồn tại hoặc đã bị xóa`);
    }

    return branch;
  }

  // 4. Cập nhật
  async update(id: number, updateBranchDto: UpdateBranchDto) {
    await this.findOne(id); 

    return this.prisma.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  // 5. XÓA MỀM (Soft Delete có xử lý ràng buộc)
  async remove(id: number) {
    const branch = await this.findOne(id);

    // LOGIC THỰC TẾ: Kiểm tra xem chi nhánh còn phòng nào đang có người ở (OCCUPIED) không?
    const occupiedRooms = await this.prisma.room.count({
      where: {
        branchId: id,
        status: 'OCCUPIED',
        deletedAt: null
      }
    });

    if (occupiedRooms > 0) {
      throw new BadRequestException(
        `Không thể xóa chi nhánh này vì vẫn còn ${occupiedRooms} phòng đang có khách thuê!`
      );
    }

    // Dùng Transaction để xóa mềm cả Chi nhánh và các Phòng trống thuộc chi nhánh đó
    return this.prisma.$transaction(async (prisma) => {
      // Xóa mềm tất cả các phòng thuộc chi nhánh này
      await prisma.room.updateMany({
        where: { branchId: id, deletedAt: null },
        data: { deletedAt: new Date() }
      });

      // Xóa mềm chi nhánh
      return prisma.branch.update({
        where: { id },
        data: { deletedAt: new Date() }, 
      });
    });
  }
  // 6. Lấy danh sách Chi nhánh đã xóa mềm (Cho Thùng rác)
async findDeleted() {
  return this.prisma.branch.findMany({
    where: { 
      deletedAt: { not: null } 
    },
    orderBy: { deletedAt: 'desc' },
  });
}

// 7. Khôi phục Chi nhánh
async restore(id: number) {
  const branch = await this.prisma.branch.findFirst({
    where: { id, deletedAt: { not: null } }
  });
  if (!branch) throw new NotFoundException('Không tìm thấy chi nhánh này trong thùng rác');

  return this.prisma.$transaction(async (prisma) => {
    // 1. Khôi phục chi nhánh
    const restoredBranch = await prisma.branch.update({
      where: { id },
      data: { deletedAt: null },
    });

    // 2. Khôi phục luôn các phòng trực thuộc (nếu Giang muốn đi kèm)
    await prisma.room.updateMany({
      where: { branchId: id, deletedAt: { not: null } },
      data: { deletedAt: null }
    });

    return restoredBranch;
  });
}

// 8. Xóa vĩnh viễn (Hard Delete)
async hardDelete(id: number) {
  const branch = await this.prisma.branch.findUnique({ where: { id } });
  if (!branch) throw new NotFoundException('Chi nhánh không tồn tại');

  return this.prisma.branch.delete({
    where: { id },
  });
}
}