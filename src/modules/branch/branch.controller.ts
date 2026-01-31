import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '../../auth/decorator/roles.decorator';
import { Public } from '../../auth/decorator/public.decorator'; 

@ApiTags('Branch - Quản lý Khu trọ')
@ApiBearerAuth()
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // --- 1. NHÓM ADMIN ---
  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách đã xóa (Admin only)' })
  findDeleted() {
    return this.branchService.findDeleted();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo khu trọ (Admin only)' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.create(createBranchDto);
  }

  // --- 2. NHÓM PUBLIC ---
  
  @Public() 
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách (Public)' })
  findAll() {
    return this.branchService.findAll();
  }

  @Public() 
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết (Public)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.findOne(id);
  }

  // --- 3. NHÓM ADMIN QUẢN LÝ ---

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật (Admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục (Admin only)' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn (Admin only)' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.hardDelete(id);
  }
}