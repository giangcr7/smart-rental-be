import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // Import Role

// Import bộ đôi bảo vệ
import{ RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@ApiTags('Invoice - Quản lý Hóa đơn')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Kích hoạt lớp bảo vệ
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // --- NHÓM QUẢN TRỊ (CHỈ ADMIN) ---

  @Post()
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được tính tiền
  @ApiOperation({ summary: 'Tạo hóa đơn & Tự động tính tiền (Chỉ Admin)' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được xác nhận thanh toán
  @ApiOperation({ summary: 'Cập nhật trạng thái/Thanh toán (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // <--- Chỉ Admin mới được xóa hóa đơn sai
  @ApiOperation({ summary: 'Xóa hóa đơn (Chỉ Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.remove(id);
  }

  // --- NHÓM XEM (AI CŨNG ĐƯỢC - NHƯNG CÓ LỌC) ---

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách (Admin thấy hết, Tenant thấy của mình)' })
  findAll(@Req() req) { // <--- Lấy User từ request
    return this.invoiceService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.invoiceService.findOne(id, req.user);
  }
}