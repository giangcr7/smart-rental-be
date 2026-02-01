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
    const branchId = Number(createRoomDto.branchId);
    const price = Number(createRoomDto.price);
    const { roomNumber } = createRoomDto;

    const existingRoom = await this.prisma.room.findFirst({
      where: { branchId, roomNumber, deletedAt: null }
    });
    
    if (existingRoom) {
      throw new BadRequestException(`Phòng ${roomNumber} đã tồn tại tại chi nhánh này!`);
    }

    return this.prisma.room.create({ 
      data: {
        ...createRoomDto,
        branchId,
        price,
        area: createRoomDto.area ? Number(createRoomDto.area) : null,
        utilities: createRoomDto.utilities || [],
      } 
    });
  }

  // 2. LẤY DANH SÁCH PHÒNG (Public)
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
  async findOne(id: number) {
    const room = await this.prisma.room.findFirst({
      where: { id: Number(id), deletedAt: null },
      include: { branch: true },
    });
    if (!room) throw new NotFoundException(`Phòng ID ${id} không tồn tại!`);
    return room;
  }

  // 4. LẤY DANH SÁCH ĐÃ XÓA (Thùng rác - Fix lỗi Property 'findDeleted' does not exist)
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

  // 5. CẬP NHẬT THÔNG TIN
  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const roomId = Number(id);
    await this.findOne(roomId); // Kiểm tra tồn tại

    const updateData: any = { ...updateRoomDto };
    if (updateData.branchId) updateData.branchId = Number(updateData.branchId);
    if (updateData.price) updateData.price = Number(updateData.price);

    return this.prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });
  }

  // 6. XÓA MỀM
  async remove(id: number) {
    const roomId = Number(id);
    return this.prisma.room.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });
  }

  // 7. KHÔI PHỤC
  async restore(id: number) {
    const roomId = Number(id);
    return this.prisma.room.update({
      where: { id: roomId },
      data: { deletedAt: null },
    });
  }

  // 8. XÓA VĨNH VIỄN
  async hardDelete(id: number) {
    const roomId = Number(id);
    return this.prisma.room.delete({ where: { id: roomId } });
  }
}