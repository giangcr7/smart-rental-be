import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, InvoiceStatus, Role } from '@prisma/client'; // Import Role

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // CHẠY SONG SONG 5 CÂU LỆNH (Tốc độ ánh sáng ⚡)
    const [
      totalBranches,
      totalRooms,
      availableRooms,
      totalTenants,
      revenueData,
      debtData // Thêm cái này: Tiền người ta đang nợ mình
    ] = await Promise.all([
      // 1. Tổng chi nhánh
      this.prisma.branch.count({ where: { deletedAt: null } }),

      // 2. Tổng phòng
      this.prisma.room.count({ where: { deletedAt: null } }),

      // 3. Phòng trống
      this.prisma.room.count({ 
        where: { status: RoomStatus.AVAILABLE, deletedAt: null } 
      }),

      // 4. Khách thuê (Dùng Enum Role.TENANT cho chuẩn)
      this.prisma.user.count({
        where: { role: Role.TENANT, deletedAt: null }
      }),

      // 5. Doanh thu THỰC TẾ tháng này (Đã đóng tiền)
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.PAID,
          month: currentMonth,
          year: currentYear,
          deletedAt: null,
        },
      }),

      // 6. Công nợ THÁNG NÀY (Chưa đóng tiền)
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.UNPAID, // Những hóa đơn chưa thanh toán
          month: currentMonth,
          year: currentYear,
          deletedAt: null,
        },
      }),
    ]);

    // Tính toán số liệu phụ
    const rentedRooms = totalRooms - availableRooms;
    
    // Xử lý null (nếu không có hóa đơn nào)
    // Lưu ý: Prisma trả về Decimal, nên convert sang Number hoặc để nguyên tùy Frontend
    const revenueAmount = Number(revenueData._sum.totalAmount) || 0;
    const debtAmount = Number(debtData._sum.totalAmount) || 0;

    return {
      overview: {
        branches: totalBranches,
        rooms: {
          total: totalRooms,
          available: availableRooms,
          rented: rentedRooms,
          occupancyRate: totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0
        },
        tenants: totalTenants,
      },
      finance: {
        month: currentMonth,
        year: currentYear,
        revenue: revenueAmount, // Tiền đã bỏ túi
        debt: debtAmount,       // Tiền cần đi đòi
        totalExpected: revenueAmount + debtAmount // Tổng doanh thu dự kiến
      }
    };
  }
}