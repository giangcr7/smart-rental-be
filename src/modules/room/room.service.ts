import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo phòng mới (Chống trùng tên trong cùng chi nhánh)
  async create(createRoomDto: CreateRoomDto) {
    const { branchId, roomNumber } = createRoomDto;

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Chi nhánh không tồn tại hoặc đã bị xóa!');

    const existingRoom = await this.prisma.room.findFirst({
      where: { branchId, roomNumber, deletedAt: null }
    });
    if (existingRoom) {
      throw new BadRequestException(`Phòng ${roomNumber} đã tồn tại trong chi nhánh này!`);
    }

    return this.prisma.room.create({ data: createRoomDto });
  }

  // 2. Lấy danh sách (Chỉ lấy phòng chưa xóa)
  async findAll() {
    return this.prisma.room.findMany({
      where: { deletedAt: null },
      include: { branch: true },
      orderBy: { roomNumber: 'asc' },
    });
  }

  // 3. Xem chi tiết
  async findOne(id: number) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { branch: true },
    });
    if (!room) throw new NotFoundException(`Phòng ID ${id} không tồn tại hoặc đã bị xóa!`);
    return room;
  }

  // 4. Cập nhật thông tin (Bao gồm check trùng tên khi đổi tên phòng)
  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const currentRoom = await this.findOne(id); // Đã bao gồm check deletedAt: null

    // Nếu có đổi tên phòng, phải kiểm tra xem tên mới có trùng với phòng khác không
    if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== currentRoom.roomNumber) {
      const duplicate = await this.prisma.room.findFirst({
        where: {
          branchId: updateRoomDto.branchId || currentRoom.branchId,
          roomNumber: updateRoomDto.roomNumber,
          deletedAt: null,
          NOT: { id: id } // Không so sánh với chính nó
        }
      });
      if (duplicate) throw new BadRequestException(`Tên phòng ${updateRoomDto.roomNumber} đã tồn tại!`);
    }

    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  // 5. Xóa mềm (Chặn xóa nếu phòng đang có người ở)
  async remove(id: number) {
    const room = await this.findOne(id);

    // LOGIC THỰC TẾ: Không được xóa phòng đang có hợp đồng ACTIVE (OCCUPIED)
    if (room.status === RoomStatus.OCCUPIED) {
      throw new BadRequestException(
        'Không thể xóa phòng đang có khách thuê! Vui lòng thanh lý hợp đồng trước khi thực hiện xóa.'
      );
    }

    return this.prisma.room.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        // Khi xóa mềm, ta có thể đổi trạng thái về MAINTENANCE để tránh nhầm lẫn
        status: RoomStatus.MAINTENANCE 
      },
    });
  }
  // 6. Lấy danh sách phòng đã xóa mềm (Cho Thùng rác)
async findDeleted() {
  return this.prisma.room.findMany({
    where: { 
      deletedAt: { not: null } 
    },
    include: { branch: true }, // Để biết phòng đó thuộc chi nhánh nào
    orderBy: { deletedAt: 'desc' },
  });
}

// 7. Khôi phục phòng
async restore(id: number) {
  const room = await this.prisma.room.findFirst({
    where: { id, deletedAt: { not: null } }
  });
  if (!room) throw new NotFoundException('Không tìm thấy phòng này trong thùng rác');

  return this.prisma.room.update({
    where: { id },
    data: { 
      deletedAt: null,
      status: RoomStatus.AVAILABLE // Khôi phục về trạng thái Trống để cho thuê lại
    },
  });
}

// 8. Xóa vĩnh viễn (Hard Delete)
async hardDelete(id: number) {
  const room = await this.prisma.room.findUnique({ where: { id } });
  if (!room) throw new NotFoundException('Phòng không tồn tại');

  // Kiểm tra lần cuối trước khi xóa sạch dữ liệu khỏi DB
  return this.prisma.room.delete({
    where: { id },
  });
}
}