import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus } from '@prisma/client'; // Import Enum từ Prisma

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo hợp đồng mới (Dùng Transaction)
  async create(createContractDto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit } = createContractDto;

    // Bước 1: Kiểm tra phòng có tồn tại và CÒN TRỐNG không?
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('Phòng này đã có người thuê hoặc đang bảo trì!');
    }

    // Bước 2: Kiểm tra người dùng có tồn tại không
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người thuê không tồn tại');

    // Bước 3: Chạy Transaction (Tạo hợp đồng + Cập nhật phòng cùng lúc)
    return this.prisma.$transaction(async (prisma) => {
      // a. Tạo hợp đồng
      const newContract = await prisma.contract.create({
        data: {
          startDate: new Date(startDate), // Convert chuỗi sang Date
          endDate: new Date(endDate),
          deposit: deposit,
          status: ContractStatus.ACTIVE,
          userId: userId,
          roomId: roomId,
        },
      });

      // b. Cập nhật trạng thái phòng sang OCCUPIED
      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.OCCUPIED },
      });

      return newContract;
    });
  }

  // 2. Lấy danh sách hợp đồng
  findAll() {
    return this.prisma.contract.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } }, // Lấy thông tin người thuê
        room: { select: { id: true, roomNumber: true, price: true } }, // Lấy thông tin phòng
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Xem chi tiết
  findOne(id: number) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { user: true, room: true },
    });
  }

  // 4. Cập nhật
  update(id: number, updateContractDto: UpdateContractDto) {
    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  // 5. Thanh lý hợp đồng (Kết thúc sớm) -> Trả phòng về AVAILABLE
  async terminate(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      // a. Cập nhật hợp đồng thành TERMINATED
      const contract = await prisma.contract.update({
        where: { id },
        data: { 
          status: ContractStatus.TERMINATED,
          deletedAt: new Date() // Xóa mềm luôn nếu muốn ẩn khỏi danh sách hiện tại
        },
      });

      // b. Trả phòng về trạng thái AVAILABLE
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }
}