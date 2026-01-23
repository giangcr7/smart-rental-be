import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../auth/guard/roles.guard'; // Đường dẫn tùy cấu trúc folder của bạn
import { Roles } from '../../auth/decorator/roles.decorator';
@ApiTags('Users - Quản lý người dùng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- 1. NHÓM ROUTE TĨNH (PHẢI ĐẶT TRÊN CÙNG) ---

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin bản thân' })
  getProfile(@Req() req) {
    return this.usersService.findOne(req.user.id, req.user);
  }

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách người dùng đã xóa mềm (Admin only)' })
  findDeleted() {
    return this.usersService.findDeleted();
  }

  // --- 2. NHÓM TẠO MỚI & LẤY TẤT CẢ ---

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo user mới (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách user đang hoạt động' })
  findAll() {
    return this.usersService.findAll();
  }

  // --- 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG) ---

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết (Admin hoặc chính chủ)' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.usersService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa user (Soft Delete)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục user từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn khỏi hệ thống' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.hardDelete(id);
  }
}