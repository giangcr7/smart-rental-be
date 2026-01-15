import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo phòng (Cần check xem Branch có tồn tại không)
  async create(createRoomDto: CreateRoomDto) {
    // Kiểm tra khu trọ có tồn tại không
    const branch = await this.prisma.branch.findUnique({
      where: { id: createRoomDto.branchId },
    });
    if (!branch) {
      throw new NotFoundException('Khu trọ không tồn tại!');
    }

    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  // 2. Lấy tất cả phòng (Chưa bị xóa)
  findAll() {
    return this.prisma.room.findMany({
      where: { deletedAt: null },
      include: { branch: true }, // Lấy kèm thông tin Khu trọ để biết phòng này thuộc khu nào
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Xem chi tiết 1 phòng
  findOne(id: number) {
    return this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { branch: true },
    });
  }

  // 4. Cập nhật
  update(id: number, updateRoomDto: UpdateRoomDto) {
    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  // 5. Xóa mềm
  remove(id: number) {
    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}