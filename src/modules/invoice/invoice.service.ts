import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceStatus, Role, Prisma } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron } from '@nestjs/schedule';

// Cấu hình giá (Nên đưa vào bảng Config trong DB nếu muốn linh động)
const PRICE_ELECTRIC = 3500;
const PRICE_WATER = 15000;
const PRICE_SERVICE = 150000;

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  // =================================================================
  // 1. TẠO HÓA ĐƠN (Có kiểm tra trùng lặp & tìm người thuê tự động)
  // =================================================================
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { roomId, oldElectricity, newElectricity, oldWater, newWater, serviceFee, month, year } = createInvoiceDto;

    // A. Validate dữ liệu đầu vào
    if ([oldElectricity, newElectricity, oldWater, newWater].some(val => val < 0)) {
      throw new BadRequestException('Chỉ số điện/nước không được âm!');
    }
    if (newElectricity < oldElectricity) throw new BadRequestException('Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ!');
    if (newWater < oldWater) throw new BadRequestException('Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ!');

    // B. Kiểm tra xem tháng này phòng đã có hóa đơn chưa?
    const existInvoice = await this.prisma.invoice.findFirst({
      where: { roomId, month, year, deletedAt: null }
    });
    if (existInvoice) {
      throw new BadRequestException(`Phòng này đã có hóa đơn tháng ${month}/${year} rồi!`);
    }

    // C. Tìm phòng và Hợp đồng đang ACTIVE
    const room = await this.prisma.room.findFirst({ 
      where: { id: roomId, deletedAt: null },
      include: { 
        contracts: { 
          where: { status: 'ACTIVE', deletedAt: null }, 
          take: 1, // Chỉ lấy 1 hợp đồng active
          include: { user: true } 
        } 
      }
    });

    if (!room) throw new NotFoundException('Phòng không tồn tại');
    
    const activeContract = room.contracts[0];
    if (!activeContract || !activeContract.user) {
      throw new BadRequestException(`Phòng ${room.roomNumber} hiện đang trống, không thể lập hóa đơn!`);
    }

    // D. Tính toán chi phí
    const electricCost = (newElectricity - oldElectricity) * PRICE_ELECTRIC;
    const waterCost = (newWater - oldWater) * PRICE_WATER;
    const roomCost = Number(room.price);
    const finalServiceFee = serviceFee !== undefined ? serviceFee : PRICE_SERVICE;
    const totalAmount = roomCost + electricCost + waterCost + finalServiceFee;

    // E. Lưu vào DB
    const invoice = await this.prisma.invoice.create({
      data: { 
        ...createInvoiceDto, 
        userId: activeContract.userId, // Tự động lấy User từ hợp đồng
        serviceFee: finalServiceFee, 
        totalAmount, 
        status: InvoiceStatus.UNPAID 
      },
      include: { room: true }
    });

    // F. Gửi mail
    if (activeContract.user?.email) {
      this.sendInvoiceEmail(activeContract.user, invoice, room.roomNumber);
    }

    return invoice;
  }

  // =================================================================
  // 2. DANH SÁCH HÓA ĐƠN (Bộ lọc đa năng: Chi nhánh, Tìm kiếm, Date)
  // =================================================================
  async findAll(
    user: any, 
    filters: { 
      branchId?: number; 
      month?: number; 
      year?: number; 
      status?: InvoiceStatus;
      keyword?: string 
    }
  ) {
    const { branchId, month, year, status, keyword } = filters;
    const where: Prisma.InvoiceWhereInput = { deletedAt: null };

    // 2.1. Phân quyền: Tenant chỉ thấy của mình, Admin thấy hết
    if (user.role !== Role.ADMIN) {
      where.userId = user.id;
    }

    // 2.2. Lọc theo Chi nhánh (Query xuyên bảng: Invoice -> Room -> Branch)
    if (branchId) {
      where.room = {
        branchId: branchId
      };
    }

    // 2.3. Các bộ lọc cơ bản
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;

    // 2.4. Tìm kiếm từ khóa (Room Number hoặc Tên người thuê)
    if (keyword) {
      where.OR = [
        { room: { roomNumber: { contains: keyword, mode: 'insensitive' } } },
        { user: { fullName: { contains: keyword, mode: 'insensitive' } } }
      ];
    }
    
    return this.prisma.invoice.findMany({
      where,
      include: { 
        room: { 
          select: { 
            roomNumber: true, 
            branchId: true,
            branch: { select: { name: true } } // Lấy tên chi nhánh để hiển thị
          } 
        },
        user: { select: { fullName: true, phone: true } } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // =================================================================
  // 3. CHI TIẾT & QR CODE
  // =================================================================
  async findOne(id: number, user: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { 
        room: { include: { branch: true } },
        user: true 
      },
    });

    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    
    // Check quyền sở hữu
    if (user.role !== Role.ADMIN && invoice.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn này!');
    }

    // Tạo Link VietQR
    const bankId = 'MB'; // Ngân hàng (Ví dụ: MB, VCB, TPB)
    const accountNo = process.env.BANK_ACCOUNT || '0000000000';
    const accountName = 'CHU NHA TRO';
    const content = `THANH TOAN P${invoice.room.roomNumber} T${invoice.month}`;
    
    // Tạo QR code nhanh (VietQR API)
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${invoice.totalAmount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;
    
    return { ...invoice, paymentQR: qrUrl };
  }

  // =================================================================
  // 4. XÁC NHẬN THANH TOÁN
  // =================================================================
  async markAsPaid(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { user: true, room: true }
    });

    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn này đã thanh toán rồi!');
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
    });

    if (invoice.user?.email) {
      this.sendPaymentSuccessEmail(invoice.user, updatedInvoice, invoice.room.roomNumber);
    }

    return updatedInvoice;
  }

  // =================================================================
  // 5. TIỆN ÍCH (Lấy chỉ số cũ, Xóa mềm...)
  // =================================================================
  
  // Lấy chỉ số điện/nước tháng trước (để Auto-fill vào form tạo mới)
  async getLatestByRoom(roomId: number) {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { roomId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { newElectricity: true, newWater: true }
    });
    return lastInvoice || { newElectricity: 0, newWater: 0 };
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    return this.prisma.invoice.update({ where: { id }, data: updateInvoiceDto });
  }

  // Xóa mềm (Soft Delete)
  async remove(id: number) {
    return this.prisma.invoice.update({ 
      where: { id }, 
      data: { deletedAt: new Date() } 
    });
  }

  // Thùng rác & Khôi phục
  async findDeleted() {
    return this.prisma.invoice.findMany({
      where: { deletedAt: { not: null } },
      include: { room: { select: { roomNumber: true } }, user: { select: { fullName: true } } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async restore(id: number) {
    return this.prisma.invoice.update({ where: { id }, data: { deletedAt: null } });
  }

  // =================================================================
  // 6. CRON JOB & EMAIL
  // =================================================================
  
  // Chạy lúc 8h sáng, từ ngày 1 đến ngày 5 hàng tháng
  @Cron('0 8 1-5 * *') 
  async handlePaymentReminder() {
    console.log('Running Auto Payment Reminder...');
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.UNPAID, deletedAt: null },
      include: { user: true, room: true }
    });

    for (const inv of unpaidInvoices) {
      if (inv.user?.email) {
        await this.sendReminderEmail(inv.user, inv);
      }
    }
  }

  private async sendInvoiceEmail(user: any, invoice: any, roomNumber: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[SmartHouse] Thông báo hóa đơn tháng ${invoice.month}/${invoice.year} - P.${roomNumber}`,
        // Template HTML nên tách ra file riêng hoặc dùng biến string dài
        html: `<p>Xin chào ${user.fullName},</p><p>Hóa đơn phòng ${roomNumber} tháng ${invoice.month} là: <b>${Number(invoice.totalAmount).toLocaleString()} VND</b></p>` 
      });
    } catch (e) { console.error('Email error:', e); }
  }

  private async sendPaymentSuccessEmail(user: any, invoice: any, roomNumber: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[SmartHouse] Xác nhận thanh toán thành công - P.${roomNumber}`,
        html: `<p>Cảm ơn bạn đã thanh toán hóa đơn tháng ${invoice.month}.</p>`
      });
    } catch (e) { console.error('Email error:', e); }
  }

  private async sendReminderEmail(user: any, invoice: any) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[Nhắc nợ] Hóa đơn tháng ${invoice.month} - P.${invoice.room.roomNumber}`,
        html: `<p>Vui lòng thanh toán số tiền ${Number(invoice.totalAmount).toLocaleString()} VND.</p>`
      });
    } catch (e) { console.error('Email error:', e); }
  }
  // ... các hàm khác

  // Xóa vĩnh viễn hóa đơn (Cẩn thận: Dữ liệu sẽ mất hoàn toàn khỏi DB)
  async hardDelete(id: number) {
    // Kiểm tra tồn tại trước (tuỳ chọn)
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

}