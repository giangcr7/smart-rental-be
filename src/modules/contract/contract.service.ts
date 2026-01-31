import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // 1. TẠO HỢP ĐỒNG: Khóa phòng & Cấp quyền AI
  async create(dto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit, scanImage, branchId } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Check phòng trống
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room || room.status !== RoomStatus.AVAILABLE) {
        throw new BadRequestException('Phòng không sẵn sàng hoặc đã có người thuê.');
      }

      // FIX LỖI: Tính toán ngày kết thúc
      // Nếu user không nhập endDate -> Mặc định lấy startDate + 1 năm
      const calculatedEndDate = endDate 
        ? new Date(endDate) 
        : new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1));

      // Tạo Contract
      const contract = await tx.contract.create({
        data: {
          startDate: new Date(startDate),
          endDate: calculatedEndDate, 
          deposit: new Prisma.Decimal(deposit),
          status: ContractStatus.ACTIVE,
          scanImage,
          userId,
          roomId,
          branchId: branchId || room.branchId, // Lưu cứng branchId
        },
      });

      // Update Phòng -> OCCUPIED
      await tx.room.update({ where: { id: roomId }, data: { status: RoomStatus.OCCUPIED } });
      
      // Update User -> Cấp quyền AI tại chi nhánh này
      await tx.user.update({ where: { id: userId }, data: { branchId: branchId || room.branchId } });

      return contract;
    });
  }

  // 2. LẤY DANH SÁCH: Lấy cả ACTIVE và TERMINATED (Chỉ trừ cái đã xóa mềm)
  async findAll(user: any, branchId?: number) {
    const where: Prisma.ContractWhereInput = { deletedAt: null }; // Quan trọng: Chỉ lấy cái chưa vào thùng rác

    if (user.role !== Role.ADMIN) {
      where.userId = user.id;
    } else {
      const targetBranch = user.branchId || branchId;
      if (targetBranch) where.branchId = Number(targetBranch);
    }

    return this.prisma.contract.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, avatar: true } },
        room: { include: { branch: true } }, 
        branch: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. CHI TIẾT
  async findOne(id: number, user: any) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { user: true, room: { include: { branch: true } }, branch: true }
    });
    // Check nếu không tồn tại hoặc đã nằm trong thùng rác
    if (!contract || contract.deletedAt) throw new NotFoundException('Hợp đồng không tồn tại');
    return contract;
  }

  // 4. CẬP NHẬT
  async update(id: number, dto: UpdateContractDto) {
    return this.prisma.contract.update({
      where: { id },
      data: {
        deposit: dto.deposit ? new Prisma.Decimal(dto.deposit) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined, 
        scanImage: dto.scanImage,
        // Dùng connect để update quan hệ an toàn
        branch: dto.branchId ? { connect: { id: Number(dto.branchId) } } : undefined,
      },
    });
  }

  // 5. THANH LÝ (Nghiệp vụ): Đổi status -> Trả phòng -> Giữ lại hồ sơ để đối soát
  // (Nếu muốn thanh lý xong vào thùng rác ngay thì dùng hàm remove bên dưới)
  async terminate(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id } });
      if (!contract) throw new NotFoundException('Không tìm thấy HĐ');

      const updated = await tx.contract.update({
        where: { id },
        data: { status: ContractStatus.TERMINATED }
      });

      await tx.room.update({ where: { id: contract.roomId }, data: { status: RoomStatus.AVAILABLE } });
      await tx.user.update({ where: { id: contract.userId }, data: { branchId: null } });

      return updated;
    });
  }

  // 6. XÓA MỀM (Thùng rác): Ẩn khỏi danh sách chính -> Trả phòng
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id } });
      if (!contract) throw new NotFoundException('Không tìm thấy HĐ');

      const deleted = await tx.contract.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          status: ContractStatus.TERMINATED 
        }
      });

      // Nếu đang thuê mà xóa HĐ -> Phải trả phòng ngay
      if (contract.status === ContractStatus.ACTIVE) {
        await tx.room.update({ where: { id: contract.roomId }, data: { status: RoomStatus.AVAILABLE } });
        await tx.user.update({ where: { id: contract.userId }, data: { branchId: null } });
      }

      return deleted;
    });
  }

  // 7. KHÔI PHỤC (Restore) - QUAN TRỌNG: Bổ sung hàm này để hết lỗi
  async restore(id: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: { not: null } },
      include: { room: true }
    });

    if (!contract) throw new NotFoundException('Hợp đồng không nằm trong thùng rác hoặc không tồn tại');

    // Logic quan trọng: Kiểm tra xem phòng cũ có đang trống không?
    // Nếu phòng đã có người khác thuê (OCCUPIED) thì không cho khôi phục.
    if (contract.room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException(`Phòng ${contract.room.roomNumber} hiện đã có người thuê mới, không thể khôi phục hợp đồng cũ.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Khôi phục hợp đồng
      const restored = await tx.contract.update({
        where: { id },
        data: { 
          deletedAt: null, 
          status: ContractStatus.ACTIVE 
        },
      });

      // 2. Đánh dấu phòng là đã thuê trở lại
      await tx.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.OCCUPIED }
      });

      // 3. Cấp lại quyền FaceID cho user
      await tx.user.update({
        where: { id: contract.userId },
        data: { branchId: contract.branchId }
      });

      return restored;
    });
  }

  // 8. HARD DELETE: Xóa vĩnh viễn
  async hardDelete(id: number) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');
    
    if (!contract.deletedAt) {
      throw new BadRequestException('Phải đưa vào thùng rác trước khi xóa vĩnh viễn.');
    }

    return this.prisma.contract.delete({ where: { id } });
  }

  // 9. LẤY DANH SÁCH THÙNG RÁC
  async findDeleted(branchId?: number) {
    return this.prisma.contract.findMany({
      where: { 
        deletedAt: { not: null },
        ...(branchId ? { branchId: Number(branchId) } : {})
      },
      include: { user: true, room: true },
      orderBy: { deletedAt: 'desc' }
    });
  }
}