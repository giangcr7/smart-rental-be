import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';

// 👇 Bỏ import AuthGuard vì không dùng trực tiếp nữa
// import { AuthGuard } from '@nestjs/passport';
// import { RolesGuard } from '../../auth/guard/roles.guard';

import { Roles } from '../../auth/decorator/roles.decorator';
import { Public } from '../../auth/decorator/public.decorator';

@ApiTags('Room - Quản lý Phòng')
@ApiBearerAuth()
// 👇 QUAN TRỌNG: XÓA DÒNG NÀY ĐI (Để Global Guard tự xử lý)
// @UseGuards(AuthGuard('jwt'), RolesGuard) 
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // --- 1. NHÓM ADMIN (Cần quyền) ---
  // Global Guard sẽ tự check Token. Nếu có @Roles(ADMIN) thì check thêm quyền.

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách đã xóa (Admin only)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findDeleted(@Query('branchId') branchId?: string) {
    return this.roomService.findDeleted(branchId ? +branchId : undefined);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thêm phòng mới (Admin only)' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  // --- 2. NHÓM PUBLIC (Khách xem được) ---
  // Global Guard thấy @Public sẽ cho qua luôn.

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng (Public - Có lọc chi nhánh)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Query('branchId') branchId?: string) {
    return this.roomService.findAll(branchId ? +branchId : undefined);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng (Public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }

  // --- 3. NHÓM ADMIN QUẢN LÝ ---

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sửa thông tin (Admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục (Admin only)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn (Admin only)' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.hardDelete(id);
  }
}