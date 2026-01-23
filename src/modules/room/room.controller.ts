import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@ApiTags('Room - Quản lý Phòng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) 
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // --- 1. NHÓM ROUTE TĨNH (PHẢI ĐẶT TRÊN CÙNG) ---

  @Get('deleted') // GET /rooms/deleted
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách phòng đã xóa mềm (Chỉ Admin)' })
  findDeleted() {
    return this.roomService.findDeleted();
  }

  // --- 2. NHÓM TẠO MỚI & LẤY TẤT CẢ ---

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thêm phòng mới (Chỉ Admin)' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả phòng đang hoạt động' })
  findAll() {
    return this.roomService.findAll();
  }

  // --- 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG) ---

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sửa thông tin phòng (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm phòng (Đưa vào thùng rác)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.remove(id);
  }

  @Patch(':id/restore') // PATCH /rooms/:id/restore
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục phòng từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.restore(id);
  }

  @Delete(':id/permanent') // DELETE /rooms/:id/permanent
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn phòng khỏi database' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.hardDelete(id);
  }
}