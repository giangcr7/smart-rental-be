import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo phòng (Đã thêm logic chống trùng tên)
  async create(createRoomDto: CreateRoomDto) {
    const { branchId, roomNumber } = createRoomDto;

    // Bước 1: Check xem Khu trọ có tồn tại không?
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException('Khu trọ không tồn tại!');
    }

    // Bước 2: Check xem trong khu này đã có phòng tên này chưa?
    // (Ví dụ: Khu A đã có P101 thì không được tạo thêm P101 nữa)
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        branchId: branchId,
        roomNumber: roomNumber,
        deletedAt: null // Chỉ check những phòng đang hoạt động
      }
    });

    if (existingRoom) {
      throw new BadRequestException(`Phòng ${roomNumber} đã tồn tại trong khu trọ này rồi!`);
    }

    // Bước 3: Tạo phòng
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  // 2. Lấy tất cả (Giữ nguyên)
  findAll() {
    return this.prisma.room.findMany({
      where: { deletedAt: null },
      include: { branch: true },
      orderBy: { roomNumber: 'asc' }, // Sắp xếp theo tên phòng cho dễ nhìn
    });
  }

  // 3. Xem chi tiết (Thêm báo lỗi 404)
  async findOne(id: number) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { branch: true },
    });

    if (!room) throw new NotFoundException(`Phòng ID ${id} không tồn tại!`);
    return room;
  }

  // 4. Cập nhật (Thêm check tồn tại)
  async update(id: number, updateRoomDto: UpdateRoomDto) {
    await this.findOne(id); // Check tồn tại trước

    // Lưu ý: Nếu user đổi tên phòng, lẽ ra cũng cần check trùng lại (Bài tập nâng cao cho Giang)
    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  // 5. Xóa mềm (Thêm check tồn tại)
  async remove(id: number) {
    await this.findOne(id); // Check tồn tại trước

    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}