import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

// Import bộ 3 bảo vệ
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@ApiTags('Contract - Quản lý Hợp đồng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // --- 1. NHÓM ROUTE TĨNH (PHẢI ĐẶT TRÊN CÙNG) ---

  @Get('deleted')
  @Roles(Role.ADMIN) 
  @ApiOperation({ summary: 'Lấy danh sách hợp đồng đã xóa mềm (Có lọc chi nhánh)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findDeleted(@Query('branchId') branchId?: string) {
    // Chuyển đổi branchId sang kiểu number trước khi gửi xuống service
    return this.contractService.findDeleted(branchId ? +branchId : undefined);
  }

  // --- 2. NHÓM TẠO MỚI & DANH SÁCH CHÍNH ---

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo hợp đồng thuê mới (Chỉ Admin)' })
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractService.create(createContractDto);
  }

  @Get()
  @ApiOperation({ summary: 'Xem danh sách (Lọc theo User và Chi nhánh)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Req() req, @Query('branchId') branchId?: string) {
    // Truyền cả thông tin user (để phân quyền) và branchId (để lọc cơ sở)
    return this.contractService.findAll(req.user, branchId ? +branchId : undefined); 
  }

  // --- 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG) ---

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hợp đồng' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.contractService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sửa thông tin hợp đồng (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }

  @Patch(':id/terminate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thanh lý hợp đồng & Trả phòng (Chỉ Admin)' })
  terminate(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.terminate(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục hợp đồng từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.restore(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm hợp đồng (Đưa vào thùng rác)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.remove(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn hợp đồng khỏi hệ thống' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.hardDelete(id);
  }
}