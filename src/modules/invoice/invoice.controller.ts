import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // Import Role

// Import bộ đôi bảo vệ
import{ RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';
@ApiTags('Invoice - Quản lý Hóa đơn')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // --- 1. NHÓM ROUTE TĨNH & ĐỊNH DANH ĐẶC BIỆT (PHẢI ĐẶT TRÊN CÙNG) ---

  @Get('deleted') // GET /invoices/deleted
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn đã xóa mềm (Chỉ Admin)' })
  findDeleted() {
    return this.invoiceService.findDeleted();
  }

  @Get('latest/:roomId') // GET /invoices/latest/:roomId
  @ApiOperation({ summary: 'Lấy chỉ số điện nước mới nhất của phòng' })
  getLatestByRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.invoiceService.getLatestByRoom(roomId);
  }

  // --- 2. NHÓM TẠO MỚI & DANH SÁCH CHÍNH ---

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo hóa đơn & Tự động tính tiền (Chỉ Admin)' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn (Phân quyền theo User)' })
  findAll(@Req() req) {
    return this.invoiceService.findAll(req.user);
  }

  // --- 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG) ---

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn & Lấy link VietQR' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.invoiceService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật trạng thái/Thanh toán (Chỉ Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm hóa đơn (Đưa vào thùng rác)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục hóa đơn từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.restore(id);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn hóa đơn khỏi hệ thống' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.hardDelete(id);
  }
}