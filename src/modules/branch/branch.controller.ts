import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@ApiTags('Branch - Quản lý Khu trọ')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // --- 1. NHÓM ROUTE TĨNH (PHẢI ĐẶT TRÊN CÙNG) ---

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách khu trọ đã xóa mềm (Admin only)' })
  findDeleted() {
    return this.branchService.findDeleted();
  }

  // --- 2. NHÓM ROUTE TẠO MỚI & LẤY TẤT CẢ ---

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo khu trọ mới (Chỉ Admin)' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.create(createBranchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khu trọ (Tất cả user)' })
  findAll() {
    return this.branchService.findAll();
  }

  // --- 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG) ---

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết khu trọ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm khu trọ (Đưa vào thùng rác)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục khu trọ từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn khu trọ khỏi database' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.hardDelete(id);
  }
}