import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceStatus, Role } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer'; //
import { Cron, CronExpression } from '@nestjs/schedule'; //

const PRICE_ELECTRIC = 3500;
const PRICE_WATER = 15000;
const PRICE_SERVICE = 150000;

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private readonly mailerService: MailerService, // Inject Mailer
  ) {}

  // 1. TẠO HÓA ĐƠN & GỬI MAIL THÔNG BÁO TỨ THÌ
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { roomId, oldElectricity, newElectricity, oldWater, newWater, serviceFee } = createInvoiceDto;

    if ([oldElectricity, newElectricity, oldWater, newWater].some(val => val < 0)) {
      throw new BadRequestException('Các chỉ số điện/nước không được là số âm!');
    }
    if (newElectricity < oldElectricity || newWater < oldWater) {
      throw new BadRequestException('Chỉ số mới không được nhỏ hơn chỉ số cũ!');
    }

    const room = await this.prisma.room.findFirst({ 
      where: { id: roomId, deletedAt: null },
      include: { contracts: { where: { status: 'ACTIVE', deletedAt: null }, include: { user: true } } }
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại');

    const electricCost = (newElectricity - oldElectricity) * PRICE_ELECTRIC;
    const waterCost = (newWater - oldWater) * PRICE_WATER;
    const roomCost = Number(room.price);
    const finalServiceFee = serviceFee !== undefined ? serviceFee : PRICE_SERVICE;
    const totalAmount = roomCost + electricCost + waterCost + finalServiceFee;

    const invoice = await this.prisma.invoice.create({
      data: { ...createInvoiceDto, serviceFee: finalServiceFee, totalAmount, status: InvoiceStatus.UNPAID },
    });

    // Tự động gửi mail cho người thuê ngay khi lập xong
    const activeContract = room.contracts[0];
    if (activeContract?.user?.email) {
      this.sendInvoiceEmail(activeContract.user, invoice, room.roomNumber);
    }

    return invoice;
  }

  // 2. TỰ ĐỘNG NHẮC HẸN THANH TOÁN (CRON JOB)
  // Chạy lúc 8h sáng mỗi ngày để nhắc các hóa đơn chưa thanh toán
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handlePaymentReminder() {
    console.log('--- Đang quét hóa đơn chưa thanh toán để nhắc hẹn ---');
    
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.UNPAID, deletedAt: null },
      include: { 
        room: { 
          include: { contracts: { where: { status: 'ACTIVE', deletedAt: null }, include: { user: true } } } 
        } 
      }
    });

    for (const inv of unpaidInvoices) {
      const tenant = inv.room.contracts[0]?.user;
      if (tenant?.email) {
        await this.sendReminderEmail(tenant, inv);
      }
    }
  }

  // Hàm phụ: Gửi mail thông báo hóa đơn mới
  private async sendInvoiceEmail(user: any, invoice: any, roomNumber: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[Thông báo] Hóa đơn tiền phòng tháng ${invoice.month}/${invoice.year}`,
        html: `
          <div style="font-family: Arial; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">THÔNG BÁO LẬP HÓA ĐƠN</h2>
            <p>Chào <b>${user.fullName}</b>, phòng <b>${roomNumber}</b> của bạn đã có hóa đơn mới:</p>
            <ul>
              <li>Tổng tiền: <b style="color: #d32f2f;">${Number(invoice.totalAmount).toLocaleString()} đ</b></li>
              <li>Tháng: ${invoice.month}/${invoice.year}</li>
            </ul>
            <p>Vui lòng đăng nhập hệ thống để quét mã <b>VietQR</b> thanh toán.</p>
          </div>
        `,
      });
    } catch (e) { console.error('Lỗi gửi mail lập hóa đơn:', e); }
  }

  // Hàm phụ: Gửi mail nhắc hẹn
  private async sendReminderEmail(user: any, invoice: any) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[Nhắc hẹn] Thanh toán hóa đơn phòng ${invoice.room.roomNumber}`,
        html: `
          <div style="font-family: Arial; padding: 20px; border: 1px solid #ffccbc; background: #fff8f6;">
            <h2 style="color: #e64a19;">NHẮC THANH TOÁN</h2>
            <p>Chào <b>${user.fullName}</b>, hiện tại hóa đơn tháng ${invoice.month} vẫn chưa được thanh toán.</p>
            <p>Số tiền: <b>${Number(invoice.totalAmount).toLocaleString()} đ</b></p>
            <p>Vui lòng hoàn tất thanh toán sớm để tránh ảnh hưởng đến các tiện ích phòng.</p>
          </div>
        `,
      });
    } catch (e) { console.error('Lỗi gửi mail nhắc hẹn:', e); }
  }

  // --- CÁC HÀM CŨ (GIỮ NGUYÊN) ---
  async findAll(user: any) {
    const where: any = { deletedAt: null };
    if (user.role !== Role.ADMIN) {
      where.room = { contracts: { some: { userId: user.id, status: 'ACTIVE', deletedAt: null } } };
    }
    return this.prisma.invoice.findMany({
      where,
      include: { room: { select: { roomNumber: true, branchId: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number, user: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { room: { include: { branch: true, contracts: { where: { deletedAt: null }, include: { user: true } } } } },
    });
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    if (user.role !== Role.ADMIN && !invoice.room.contracts.some(c => c.userId === user.id)) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn này!');
    }
    const bankId = 'VCB';
    const accountNo = process.env.BANK_ACCOUNT || '1234567890';
    const accountName = 'LE HOANG GIANG';
    const description = `THANH TOAN HD${invoice.id}`;
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${invoice.totalAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;
    return { ...invoice, paymentQR: qrUrl };
  }

  async getLatestByRoom(roomId: number) {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { roomId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { newElectricity: true, newWater: true }
    });
    return lastInvoice || { newElectricity: 0, newWater: 0 };
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    return this.prisma.invoice.update({ where: { id }, data: updateInvoiceDto });
  }

  async remove(id: number) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    return this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  // 7. Lấy danh sách hóa đơn đã xóa (Dùng cho Thùng rác)
async findDeleted() {
  return this.prisma.invoice.findMany({
    where: { 
      deletedAt: { not: null } 
    },
    include: { 
      room: { select: { roomNumber: true } } 
    },
    orderBy: { deletedAt: 'desc' },
  });
}

// 8. Khôi phục hóa đơn
async restore(id: number) {
  const invoice = await this.prisma.invoice.findFirst({
    where: { id, deletedAt: { not: null } }
  });
  if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn này trong thùng rác');

  return this.prisma.invoice.update({
    where: { id },
    data: { deletedAt: null }, // Đưa hóa đơn trở lại danh sách hoạt động
  });
}

// 9. Xóa vĩnh viễn hóa đơn
async hardDelete(id: number) {
  const invoice = await this.prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');

  return this.prisma.invoice.delete({
    where: { id },
  });
}
}