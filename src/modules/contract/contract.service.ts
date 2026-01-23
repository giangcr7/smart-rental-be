import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus, Role } from '@prisma/client';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo hợp đồng mới
  async create(createContractDto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit, scanImage } = createContractDto;

    const room = await this.prisma.room.findFirst({ 
      where: { id: roomId, deletedAt: null } 
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại hoặc đã bị xóa');
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('Phòng này đã có người thuê hoặc đang bảo trì!');
    }

    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, deletedAt: null } 
    });
    if (!user) throw new NotFoundException('Người thuê không tồn tại');

    return this.prisma.$transaction(async (prisma) => {
      const newContract = await prisma.contract.create({
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          deposit: deposit,
          status: ContractStatus.ACTIVE,
          userId: userId,
          roomId: roomId,
          scanImage: scanImage,
        },
      });

      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.OCCUPIED },
      });

      return newContract;
    });
  }

  // 2. Lấy danh sách (Lọc xóa mềm & Phân quyền)
  async findAll(user: any) {
    const whereCondition: any = { deletedAt: null };

    if (user.role !== Role.ADMIN) {
      whereCondition.userId = user.id;
    }

    return this.prisma.contract.findMany({
      where: whereCondition,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, roomNumber: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Xem chi tiết (Chặn xem các bản ghi đã xóa mềm)
  async findOne(id: number, user: any) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null }, // Đảm bảo không tìm thấy nếu đã xóa mềm
      include: { user: true, room: true },
    });

    if (!contract) throw new NotFoundException(`Hợp đồng #${id} không tồn tại hoặc đã bị xóa`);

    if (user.role !== Role.ADMIN && contract.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này!');
    }

    return contract;
  }

  // 4. Cập nhật thông tin (Chỉ cập nhật nếu chưa xóa)
  async update(id: number, updateContractDto: UpdateContractDto) {
    const existing = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) throw new NotFoundException('Hợp đồng không tồn tại hoặc đã bị xóa');

    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  // 5. Thanh lý hợp đồng
  async terminate(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const existingContract = await prisma.contract.findFirst({ 
        where: { id, deletedAt: null } 
      });
      if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại');

      const contract = await prisma.contract.update({
        where: { id },
        data: { status: ContractStatus.TERMINATED },
      });

      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }

  // 6. Xóa mềm hợp đồng (SOFT DELETE)
  async remove(id: number) {
    const existingContract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null }
    });
    
    if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại hoặc đã bị xóa từ trước');

    return this.prisma.$transaction(async (prisma) => {
      // Đánh dấu thời gian xóa thay vì xóa thật khỏi DB
      const contract = await prisma.contract.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Rất quan trọng: Khi xóa hợp đồng thì phải trả trạng thái phòng về AVAILABLE
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }
  // 7. Lấy danh sách hợp đồng đã xóa mềm (Dùng cho Thùng rác)
async findDeleted() {
  return this.prisma.contract.findMany({
    where: { 
      deletedAt: { not: null } // Chỉ lấy các bản ghi có đánh dấu xóa
    },
    include: {
      user: { select: { fullName: true } },
      room: { select: { roomNumber: true } },
    },
    orderBy: { deletedAt: 'desc' },
  });
}

// 8. Khôi phục hợp đồng
async restore(id: number) {
  const contract = await this.prisma.contract.findFirst({
    where: { id, deletedAt: { not: null } }
  });
  if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng này trong thùng rác');

  return this.prisma.$transaction(async (prisma) => {
    // Khôi phục hợp đồng
    const restoredContract = await prisma.contract.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Cập nhật lại phòng tương ứng sang OCCUPIED nếu hợp đồng vẫn là ACTIVE
    if (restoredContract.status === ContractStatus.ACTIVE) {
      await prisma.room.update({
        where: { id: restoredContract.roomId },
        data: { status: RoomStatus.OCCUPIED },
      });
    }

    return restoredContract;
  });
}

// 9. Xóa vĩnh viễn hợp đồng
async hardDelete(id: number) {
  const contract = await this.prisma.contract.findUnique({ where: { id } });
  if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');

  return this.prisma.contract.delete({
    where: { id },
  });
}
}