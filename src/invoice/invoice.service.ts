import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceStatus, Role } from '@prisma/client';

// CẤU HÌNH GIÁ (Để ở ngoài hoặc trong Class đều được, để đây cho gọn)
const PRICE_ELECTRIC = 3500;  // 3.5k/số
const PRICE_WATER = 15000;    // 15k/khối
const PRICE_SERVICE = 150000; // 150k dịch vụ

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  // 1. TẠO HÓA ĐƠN & TÍNH TIỀN (Giữ nguyên logic của bạn + thêm Service Fee)
  async create(createInvoiceDto: CreateInvoiceDto) {
    const { roomId, oldElectricity, newElectricity, oldWater, newWater, serviceFee } = createInvoiceDto;

    // Validate
    if (newElectricity < oldElectricity || newWater < oldWater) {
      throw new BadRequestException('Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ!');
    }

    // Lấy giá phòng
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');

    // TÍNH TOÁN 🧮
    const usedElectric = newElectricity - oldElectricity;
    const usedWater = newWater - oldWater;

    const electricCost = usedElectric * PRICE_ELECTRIC;
    const waterCost = usedWater * PRICE_WATER;
    const roomCost = Number(room.price); // Convert Decimal -> Number
    const finalServiceFee = serviceFee || PRICE_SERVICE; // Nếu không nhập thì lấy mặc định

    const totalAmount = roomCost + electricCost + waterCost + finalServiceFee;

    // Lưu DB
    return this.prisma.invoice.create({
      data: {
        ...createInvoiceDto,
        serviceFee: finalServiceFee,
        totalAmount: totalAmount,
        status: InvoiceStatus.UNPAID, // Dùng Enum cho chuẩn
      },
    });
  }

  // 2. LẤY DANH SÁCH (ĐÃ SỬA: Thêm biến user để phân quyền)
  async findAll(user: any) {
    // Nếu là ADMIN: Lấy tất cả
    if (user.role === Role.ADMIN) {
      return this.prisma.invoice.findMany({
        where: { deletedAt: null },
        include: { room: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Nếu là TENANT: Chỉ lấy hóa đơn của phòng mình đang thuê
    return this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        room: {
          contracts: {
            some: { userId: user.id } // Phòng này có HĐ của user này
          }
        }
      },
      include: { room: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 3. XEM CHI TIẾT (ĐÃ SỬA: Thêm biến user để chặn xem trộm)
  async findOne(id: number, user: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { 
        room: {
           include: { contracts: true } // Lấy HĐ để check quyền
        } 
      },
    });

    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');

    // Nếu là Admin -> Cho qua
    if (user.role === Role.ADMIN) return invoice;

    // Nếu là Tenant -> Check xem có phải phòng của mình không
    const isMyRoom = invoice.room.contracts.some(c => c.userId === user.id);
    if (!isMyRoom) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn này!');
    }

    return invoice;
  }

  // 4. CẬP NHẬT (Admin only)
  async update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    await this.checkExist(id); // Check tồn tại trước
    return this.prisma.invoice.update({
      where: { id },
      data: updateInvoiceDto,
    });
  }

  // 5. XÓA (Admin only)
  async remove(id: number) {
    await this.checkExist(id); // Check tồn tại trước
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Hàm phụ: Kiểm tra tồn tại
  private async checkExist(id: number) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Hóa đơn không tồn tại');
  }
}