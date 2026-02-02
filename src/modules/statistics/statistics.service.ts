import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, InvoiceStatus, Role } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(branchId?: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const commonFilter = {
      deletedAt: null,
      ...(branchId && { branchId }), // Lọc theo chi nhánh nếu có
    };

    // 1. TÍNH BIỂU ĐỒ 6 THÁNG (DOANH THU)
    // Dùng Promise.all để chạy song song 6 câu lệnh thay vì chờ từng cái (Nhanh hơn)
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { month: d.getMonth() + 1, year: d.getFullYear() };
    });

    const chartDataPromises = months.map(async ({ month, year }) => {
        const sum = await this.prisma.invoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: InvoiceStatus.PAID,
                month: month,
                year: year,
                deletedAt: null,
                room: branchId ? { is: { branchId } } : undefined,
            }
        });
        return {
            name: `T${month}/${year}`,
            total: Number(sum._sum.totalAmount) || 0
        };
    });

    // 2. TRUY VẤN CÁC CHỈ SỐ KHÁC
    const [
      chartData,      // Kết quả của biểu đồ trên
      totalRooms,
      availableRooms,
      totalTenants,
      currentDebt     // Công nợ
    ] = await Promise.all([
      Promise.all(chartDataPromises), // Chờ biểu đồ chạy xong
      this.prisma.room.count({ where: commonFilter }),
      this.prisma.room.count({ 
        where: { ...commonFilter, status: RoomStatus.AVAILABLE } 
      }),
      this.prisma.user.count({
        where: { 
          role: Role.TENANT, 
          deletedAt: null,
          contracts: branchId ? { some: { room: { is: { branchId } } } } : undefined
        }
      }),
      // 🔥 SỬA LOGIC CÔNG NỢ: Bỏ lọc month/year để tính TẤT CẢ nợ cũ
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.UNPAID,
          deletedAt: null,
          room: branchId ? { is: { branchId } } : undefined,
          // ❌ Đã xóa month: currentMonth
          // ❌ Đã xóa year: currentYear
        },
      }),
    ]);

    const rentedRooms = totalRooms - availableRooms;
    const currentRevenue = chartData[chartData.length - 1].total;

    return {
      overview: {
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
        revenue: currentRevenue,
        debt: Number(currentDebt._sum.totalAmount) || 0,
        chartData
      }
    };
  }
}