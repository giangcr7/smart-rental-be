import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  // ĐỊNH NGHĨA GIÁ DỊCH VỤ (Sau này có thể đưa vào Database cấu hình riêng)
  private readonly ELECTRIC_PRICE = 3500; // 3.5k / 1 số
  private readonly WATER_PRICE = 15000;   // 15k / 1 khối

  async create(createInvoiceDto: CreateInvoiceDto) {
    const { roomId, oldElectricity, newElectricity, oldWater, newWater, serviceFee } = createInvoiceDto;

    // 1. Validate: Số mới phải lớn hơn số cũ
    if (newElectricity < oldElectricity || newWater < oldWater) {
      throw new BadRequestException('Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ!');
    }

    // 2. Lấy thông tin Phòng để biết Giá thuê phòng (Room Price)
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Phòng không tồn tại');

    // 3. TÍNH TOÁN TIỀN
    const usedElectric = newElectricity - oldElectricity;
    const usedWater = newWater - oldWater;

    const electricCost = usedElectric * this.ELECTRIC_PRICE;
    const waterCost = usedWater * this.WATER_PRICE;
    const roomCost = Number(room.price); // Giá phòng cơ bản
    
    const totalAmount = roomCost + electricCost + waterCost + serviceFee;

    // 4. Lưu vào DB
    return this.prisma.invoice.create({
      data: {
        ...createInvoiceDto,
        totalAmount: totalAmount, // Lưu tổng tiền đã tính
        status: 'UNPAID'
      },
    });
  }

  findAll() {
    return this.prisma.invoice.findMany({
      where: { deletedAt: null },
      include: { room: true }, // Lấy kèm tên phòng
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: number) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { room: true },
    });
  }

  // Cập nhật trạng thái (VD: Khách đã trả tiền)
  update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    return this.prisma.invoice.update({
      where: { id },
      data: updateInvoiceDto,
    });
  }

  remove(id: number) {
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}