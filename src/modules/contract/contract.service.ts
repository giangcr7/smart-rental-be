import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, ContractStatus, Role } from '@prisma/client';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo hợp đồng mới (Có lưu ảnh scanImage)
  async create(createContractDto: CreateContractDto) {
    const { roomId, userId, startDate, endDate, deposit, scanImage } = createContractDto;

    // Kiểm tra phòng có tồn tại và còn trống không
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    if (room.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('Phòng này đã có người thuê hoặc đang bảo trì!');
    }

    // Kiểm tra người dùng có tồn tại không
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người thuê không tồn tại');

    // Dùng Transaction để đảm bảo tính toàn vẹn: Tạo HĐ xong thì Phòng phải đổi trạng thái
    return this.prisma.$transaction(async (prisma) => {
      const newContract = await prisma.contract.create({
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          deposit: deposit,
          status: ContractStatus.ACTIVE,
          userId: userId,
          roomId: roomId,
          scanImage: scanImage, // <--- Đã thêm trường lưu ảnh
        },
      });

      // Cập nhật trạng thái phòng thành ĐÃ THUÊ (OCCUPIED)
      await prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.OCCUPIED },
      });

      return newContract;
    });
  }

  // 2. Lấy danh sách (Phân quyền: Admin thấy hết, Tenant thấy của mình)
  async findAll(user: any) {
    const whereCondition: any = { deletedAt: null };

    // Nếu không phải Admin thì chỉ lọc ra các hợp đồng của chính User đó
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

  // 3. Xem chi tiết (Có bảo mật chặn xem trộm)
  async findOne(id: number, user: any) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { user: true, room: true },
    });

    if (!contract) throw new NotFoundException(`Hợp đồng #${id} không tồn tại`);

    // Chặn nếu không phải Admin và cũng không phải chủ hợp đồng
    if (user.role !== Role.ADMIN && contract.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này!');
    }

    return contract;
  }

  // 4. Cập nhật thông tin hợp đồng
  async update(id: number, updateContractDto: UpdateContractDto) {
    return this.prisma.contract.update({
      where: { id },
      data: updateContractDto,
    });
  }

  // 5. Thanh lý hợp đồng (Trả phòng về trạng thái trống)
  async terminate(id: number) {
    return this.prisma.$transaction(async (prisma) => {
      const existingContract = await prisma.contract.findUnique({ where: { id } });
      if (!existingContract) throw new NotFoundException('Hợp đồng không tồn tại');

      // Đổi trạng thái hợp đồng thành TERMINATED (Đã thanh lý)
      const contract = await prisma.contract.update({
        where: { id },
        data: { status: ContractStatus.TERMINATED },
      });

      // Trả lại trạng thái phòng trống (AVAILABLE) để người khác thuê
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      return contract;
    });
  }
}