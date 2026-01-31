import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Contract - Quản lý Hợp đồng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // ==================================================================
  // 1. NHÓM ROUTE TĨNH (PHẢI ĐẶT TRÊN CÙNG)
  // ==================================================================

  @Get('deleted') 
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xem thùng rác (Các hợp đồng đã xóa mềm)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findDeleted(@Query('branchId') branchId?: string) {
    // Chuyển string query sang number
    return this.contractService.findDeleted(branchId ? +branchId : undefined);
  }

  // ==================================================================
  // 2. NHÓM ROUTE CƠ BẢN (LIST & CREATE)
  // ==================================================================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo hợp đồng mới (Khóa phòng & Cấp quyền AI)' })
  create(@Body() dto: CreateContractDto) {
    return this.contractService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách (Bao gồm Active + Terminated)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number })
  findAll(@Req() req, @Query('branchId') branchId?: string) {
    return this.contractService.findAll(req.user, branchId ? +branchId : undefined);
  }

  // ==================================================================
  // 3. NHÓM ROUTE CÓ THAM SỐ ID (PHẢI ĐẶT DƯỚI CÙNG)
  // ==================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hợp đồng' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.contractService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin hợp đồng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractDto) {
    return this.contractService.update(id, dto);
  }

  // 👇👇👇 QUAN TRỌNG: Route này dùng để khôi phục từ thùng rác 👇👇👇
  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục hợp đồng từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.restore(id);
  }

  @Patch(':id/terminate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Thanh lý (Đổi trạng thái -> Trả phòng -> Giữ hồ sơ)' })
  terminate(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.terminate(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm (Đưa vào thùng rác & Trả phòng)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.remove(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn (Chỉ dùng trong thùng rác)' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.hardDelete(id);
  }
}