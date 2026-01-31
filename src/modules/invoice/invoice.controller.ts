import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, ParseIntPipe, Req, Query 
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role, InvoiceStatus } from '@prisma/client'; // Import thêm InvoiceStatus

// Import bộ đôi bảo vệ
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@ApiTags('Invoice - Quản lý Hóa đơn')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // =================================================================
  // 1. NHÓM ROUTE TĨNH & ĐỊNH DANH ĐẶC BIỆT (PHẢI ĐẶT TRÊN CÙNG)
  // =================================================================

  @Get('deleted') // GET /invoices/deleted
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn đã xóa mềm (Thùng rác)' })
  findDeleted() {
    return this.invoiceService.findDeleted();
  }

  @Get('latest/:roomId') // GET /invoices/latest/101
  @ApiOperation({ summary: 'Lấy chỉ số điện nước mới nhất của phòng (Hỗ trợ form tạo mới)' })
  getLatestByRoom(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.invoiceService.getLatestByRoom(roomId);
  }

  // =================================================================
  // 2. NHÓM TẠO MỚI & DANH SÁCH CHÍNH
  // =================================================================

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo hóa đơn & Tự động tính tiền (Chỉ Admin)' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn (Có bộ lọc)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Lọc theo ID chi nhánh' })
  @ApiQuery({ name: 'month', required: false, description: 'Lọc theo tháng' })
  @ApiQuery({ name: 'year', required: false, description: 'Lọc theo năm' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus, description: 'Trạng thái: UNPAID | PAID' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Tìm theo tên phòng hoặc tên khách' })
  findAll(
    @Req() req,
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('keyword') keyword?: string,
  ) {
    // Chuyển đổi String từ Query Param sang Number/Type chuẩn
    return this.invoiceService.findAll(req.user, {
      branchId: branchId ? +branchId : undefined,
      month: month ? +month : undefined,
      year: year ? +year : undefined,
      status: status,
      keyword: keyword
    });
  }

  // =================================================================
  // 3. NHÓM ROUTE CÓ THAM SỐ :id (PHẢI ĐẶT DƯỚI CÙNG)
  // =================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hóa đơn & Lấy link VietQR' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.invoiceService.findOne(id, req.user);
  }

  @Patch(':id/pay') 
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin xác nhận đã thu tiền (Chuyển sang PAID)' })
  markAsPaid(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.markAsPaid(id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khôi phục hóa đơn từ thùng rác' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.restore(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin hóa đơn (Sửa sai)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(':id/permanent')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa vĩnh viễn hóa đơn khỏi hệ thống (Cẩn thận)' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.hardDelete(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm hóa đơn (Đưa vào thùng rác)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.remove(id);
  }
}