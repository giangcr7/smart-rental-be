import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
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

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách phòng đã xóa mềm' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findDeleted(@Query('branchId') branchId?: string) {
    return this.roomService.findDeleted(branchId ? +branchId : undefined);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thêm phòng mới' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng (Có lọc chi nhánh)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Query('branchId') branchId?: string) {
    return this.roomService.findAll(branchId ? +branchId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sửa thông tin phòng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm phòng' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục phòng' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn phòng' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.hardDelete(id);
  }
}