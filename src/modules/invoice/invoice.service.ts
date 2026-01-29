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
// TỰ ĐỘNG NHẮC HẸN THANH TOÁN (CRON JOB)
  // Chạy lúc 8:00 sáng, từ ngày 1 đến ngày 5 hàng tháng
  @Cron('0 8 1-5 * *') 
  async handlePaymentReminder() {
    console.log(`[${new Date().toLocaleString()}] --- Đang thực hiện nhắc nợ đầu tháng (Ngày 1-5) ---`);
    
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { 
        status: InvoiceStatus.UNPAID, 
        deletedAt: null 
      },
      include: { 
        room: { 
          include: { 
            contracts: { 
              where: { status: 'ACTIVE', deletedAt: null }, 
              include: { user: true } 
            } 
          } 
        } 
      }
    });

    if (unpaidInvoices.length === 0) {
      console.log('Không có hóa đơn nào cần nhắc nợ hôm nay.');
      return;
    }

    for (const inv of unpaidInvoices) {
      // Sử dụng Optional Chaining để tránh lỗi nếu dữ liệu không khớp
      const tenant = inv.room?.contracts?.[0]?.user;
      
      if (tenant?.email) {
        console.log(`Đang gửi nhắc nợ tới: ${tenant.email} - Phòng: ${inv.room.roomNumber}`);
        await this.sendReminderEmail(tenant, inv);
      }
    }
  }
  private async sendInvoiceEmail(user: any, invoice: any, roomNumber: string) {
    try {
      // Tính toán tiêu thụ để hiển thị
      const electricityUsed = invoice.newElectricity - invoice.oldElectricity;
      const waterUsed = invoice.newWater - invoice.oldWater;

      await this.mailerService.sendMail({
        to: user.email,
        subject: `[SmartHouse] Thông báo hóa đơn tiền phòng tháng ${invoice.month}/${invoice.year} - Phòng ${roomNumber}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #3b82f6; margin: 0;">THÔNG BÁO LẬP HÓA ĐƠN</h2>
              <p style="font-size: 14px; color: #64748b;">Hệ thống quản lý SmartHouse</p>
            </div>
            
            <p>Chào <b>${user.fullName}</b>,</p>
            <p>Phòng <b>${roomNumber}</b> của bạn đã có hóa đơn mới cho tháng <b>${invoice.month}/${invoice.year}</b> với chi tiết như sau:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f8fafc;">
                <th style="text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0;">Hạng mục</th>
                <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0;">Chi tiết</th>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Điện (Số cũ: ${invoice.oldElectricity} - Mới: ${invoice.newElectricity})</td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9;">${electricityUsed} kWh</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Nước (Số cũ: ${invoice.oldWater} - Mới: ${invoice.newWater})</td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9;">${waterUsed} m³</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Phí dịch vụ cố định</td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9;">${Number(invoice.serviceFee).toLocaleString()} đ</td>
              </tr>
              <tr style="font-weight: bold; color: #d32f2f;">
                <td style="padding: 15px; background-color: #fff1f2;">TỔNG TIỀN THANH TOÁN</td>
                <td style="text-align: right; padding: 15px; background-color: #fff1f2; font-size: 18px;">${Number(invoice.totalAmount).toLocaleString()} đ</td>
              </tr>
            </table>

            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                <b>Lưu ý:</b> Vui lòng đăng nhập vào hệ thống để quét mã <b>VietQR</b> và hoàn tất thanh toán trước ngày 05 hàng tháng.
              </p>
            </div>
            
            <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
              Đây là email tự động từ hệ thống quản lý SmartHouse. Vui lòng không trả lời email này.
            </p>
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
// 10. XÁC NHẬN THU TIỀN THÀNH CÔNG
  async markAsPaid(id: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { 
        room: { 
          include: { contracts: { where: { status: 'ACTIVE', deletedAt: null }, include: { user: true } } } 
        } 
      }
    });

    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn này đã được thanh toán trước đó');
    }

    // Cập nhật trạng thái trong Database
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
    });

    // Gửi mail xác nhận đã thu tiền cho cư dân
    const tenant = invoice.room.contracts[0]?.user;
    if (tenant?.email) {
      this.sendPaymentSuccessEmail(tenant, updatedInvoice, invoice.room.roomNumber);
    }

    return updatedInvoice;
  }

  // Hàm phụ: Gửi mail cảm ơn đã thanh toán
  private async sendPaymentSuccessEmail(user: any, invoice: any, roomNumber: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[SmartHouse] Xác nhận thanh toán thành công - Phòng ${roomNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #dcfce7; background: #f0fdf4; border-radius: 12px;">
            <h2 style="color: #15803d; text-align: center;">THANH TOÁN THÀNH CÔNG</h2>
            <p>Chào bạn <b>${user.fullName}</b>,</p>
            <p>Hệ thống SmartHouse đã ghi nhận khoản thanh toán của bạn cho hóa đơn <b>tháng ${invoice.month}/${invoice.year}</b>.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
              <p>📍 Phòng: <b>${roomNumber}</b></p>
              <p>💰 Số tiền đã nhận: <b style="color: #15803d;">${Number(invoice.totalAmount).toLocaleString()} đ</b></p>
              <p>📅 Thời gian xác nhận: ${new Date().toLocaleString('vi-VN')}</p>
            </div>

            <p>Cảm ơn bạn đã tin dùng dịch vụ của chúng tôi!</p>
          </div>
        `,
      });
      console.log(`✅ Đã gửi biên lai cho: ${user.email}`);
    } catch (e) { 
      console.error('❌ Lỗi gửi mail xác nhận thu tiền:', e.message); 
    }
  }
}