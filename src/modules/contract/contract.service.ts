import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus, Role } from '@prisma/client'; // Import thêm Role

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo hợp đồng mới (Giữ nguyên - Logic tốt)
  async create(createContractDto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit } = createContractDto;

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('Phòng này đã có người thuê hoặc đang bảo trì!');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
        },
      });

      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.OCCUPIED },
      });

      return newContract;
    });
  }

  // 2. Lấy danh sách (ĐÃ SỬA: Phân quyền Admin/Tenant)
  async findAll(user: any) {
    // Tạo bộ lọc mặc định
    const whereCondition: any = { deletedAt: null };

    // Nếu KHÔNG PHẢI ADMIN -> Chỉ được lấy hợp đồng CỦA MÌNH
    if (user.role !== Role.ADMIN) {
      whereCondition.userId = user.id;
    }

    return this.prisma.contract.findMany({
      where: whereCondition, // Áp dụng bộ lọc
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, roomNumber: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Xem chi tiết (ĐÃ SỬA: Chặn xem trộm)
  async findOne(id: number, user: any) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { user: true, room: true },
    });

    if (!contract) throw new NotFoundException(`Hợp đồng #${id} không tồn tại`);

    // LOGIC BẢO MẬT:
    // Nếu user không phải Admin VÀ cũng không phải chủ sở hữu hợp đồng -> CẤM
    if (user.role !== Role.ADMIN && contract.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này!');
    }

    return contract;
  }

  // 4. Cập nhật (Giữ nguyên)
  update(id: number, updateContractDto: UpdateContractDto) {
    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  // 5. Thanh lý hợp đồng (Giữ nguyên - Logic tốt)
  async terminate(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      // a. Kiểm tra hợp đồng tồn tại không trước khi update
      const existingContract = await prisma.contract.findUnique({ where: { id } });
      if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại');

      // b. Cập nhật hợp đồng thành TERMINATED
      const contract = await prisma.contract.update({
        where: { id },
        data: { 
          status: ContractStatus.TERMINATED,
          // deletedAt: new Date() // Tùy chọn: Có muốn ẩn luôn không hay giữ lại lịch sử
        },
      });

      // c. Trả phòng về trạng thái AVAILABLE
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }
}