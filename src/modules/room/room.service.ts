import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  // 1. TẠO PHÒNG MỚI
  async create(createRoomDto: CreateRoomDto) {
    const { branchId, roomNumber } = createRoomDto;

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Chi nhánh không tồn tại!');

    const existingRoom = await this.prisma.room.findFirst({
      where: { branchId, roomNumber, deletedAt: null }
    });
    if (existingRoom) {
      throw new BadRequestException(`Phòng ${roomNumber} đã tồn tại tại chi nhánh này!`);
    }

    return this.prisma.room.create({ 
      data: {
        ...createRoomDto,
        utilities: createRoomDto.utilities || [],
      } 
    });
  }

  // 2. LẤY DANH SÁCH PHÒNG (Hỗ trợ lọc đa chi nhánh)
  async findAll(branchId?: number) {
    return this.prisma.room.findMany({
      where: { 
        deletedAt: null,
        ...(branchId ? { branchId: Number(branchId) } : {}),
      },
      include: { branch: true },
      orderBy: { roomNumber: 'asc' },
    });
  }

  // 3. XEM CHI TIẾT PHÒNG
// src/rooms/room.service.ts

async findOne(id: number) {
  const room = await this.prisma.room.findFirst({
    where: { id, deletedAt: null },
    include: { 
      branch: true,
      // Lấy thêm hợp đồng đang hoạt động để hiện thông tin người thuê
      contracts: {
        where: { status: 'ACTIVE', deletedAt: null },
        include: { user: true }
      }
    },
  });
  if (!room) throw new NotFoundException(`Phòng ID ${id} không tồn tại!`);
  return room;
}

  // 4. CẬP NHẬT THÔNG TIN
  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const currentRoom = await this.findOne(id);

    if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== currentRoom.roomNumber) {
      const duplicate = await this.prisma.room.findFirst({
        where: {
          branchId: updateRoomDto.branchId || currentRoom.branchId,
          roomNumber: updateRoomDto.roomNumber,
          deletedAt: null,
          NOT: { id: id }
        }
      });
      if (duplicate) throw new BadRequestException(`Tên phòng ${updateRoomDto.roomNumber} đã tồn tại!`);
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        ...updateRoomDto,
        utilities: updateRoomDto.utilities ?? currentRoom.utilities,
      },
    });
  }

  // 5. XÓA MỀM
  async remove(id: number) {
    const room = await this.findOne(id);

    if (room.status === RoomStatus.OCCUPIED) {
      throw new BadRequestException('Không thể xóa phòng đang có khách thuê!');
    }

    return this.prisma.room.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        status: RoomStatus.MAINTENANCE 
      },
    });
  }

  // 6. THÙNG RÁC (Lọc theo chi nhánh)
  async findDeleted(branchId?: number) {
    return this.prisma.room.findMany({
      where: { 
        deletedAt: { not: null },
        ...(branchId ? { branchId: Number(branchId) } : {}),
      },
      include: { branch: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 7. KHÔI PHỤC
  async restore(id: number) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: { not: null } }
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng trong thùng rác');

    return this.prisma.room.update({
      where: { id },
      data: { 
        deletedAt: null,
        status: RoomStatus.AVAILABLE 
      },
    });
  }

  // 8. XÓA VĨNH VIỄN
  async hardDelete(id: number) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');

    return this.prisma.room.delete({ where: { id } });
  }
}