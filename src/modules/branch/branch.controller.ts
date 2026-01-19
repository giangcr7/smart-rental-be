import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // 1. Import Role

// 2. Import "Bộ đôi bảo vệ"
import{ RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
@ApiTags('Branch - Quản lý Khu trọ')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // 3. Kích hoạt cả 2 lớp bảo vệ
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // --- CHỈ ADMIN MỚI ĐƯỢC TÁC ĐỘNG ---

  @Post()
  @Roles(Role.ADMIN) // <--- Chốt chặn: Chỉ Admin mới được xây nhà mới
  @ApiOperation({ summary: 'Tạo khu trọ mới (Chỉ Admin)' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.create(createBranchDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // <--- Chốt chặn: Chỉ Admin mới được sửa địa chỉ
  @ApiOperation({ summary: 'Cập nhật thông tin (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchService.update(id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // <--- Chốt chặn: Chỉ Admin mới được đập nhà
  @ApiOperation({ summary: 'Xóa mềm khu trọ (Chỉ Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.remove(id);
  }

  // --- AI CŨNG XEM ĐƯỢC (MIỄN LÀ ĐÃ ĐĂNG NHẬP) ---
  
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khu trọ' })
  // Không gắn @Roles -> Tenant hay Admin đều xem được để chọn phòng
  findAll() {
    return this.branchService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết khu trọ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.findOne(id);
  }
}