import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, InvoiceStatus, Role } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. LẤY DỮ LIỆU DOANH THU 6 THÁNG GẦN NHẤT (Cho biểu đồ cột)
    const chartData: { name: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      // Lùi lại i tháng tính từ tháng hiện tại
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth() + 1;
      const y = targetDate.getFullYear();

      const monthlySum = await this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.PAID,
          month: m,
          year: y,
          deletedAt: null,
        },
      });

      chartData.push({
        name: `T${m}/${y.toString().slice(-2)}`, // Định dạng: T1/26
        total: Number(monthlySum._sum.totalAmount) || 0,
      });
    }

    // 2. CHẠY SONG SONG CÁC CHỈ SỐ TỔNG QUAN (Tối ưu hiệu năng ⚡)
    const [
      totalBranches,
      totalRooms,
      availableRooms,
      totalTenants,
      currentDebt
    ] = await Promise.all([
      // Tổng chi nhánh
      this.prisma.branch.count({ where: { deletedAt: null } }),

      // Tổng phòng
      this.prisma.room.count({ where: { deletedAt: null } }),

      // Phòng trống
      this.prisma.room.count({ 
        where: { status: RoomStatus.AVAILABLE, deletedAt: null } 
      }),

      // Khách thuê
      this.prisma.user.count({
        where: { role: Role.TENANT, deletedAt: null }
      }),

      // Công nợ tháng này (Các hóa đơn chưa đóng tiền)
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.UNPAID,
          month: currentMonth,
          year: currentYear,
          deletedAt: null,
        },
      }),
    ]);

    // Tính toán các thông số bổ sung
    const rentedRooms = totalRooms - availableRooms;
    const revenueAmount = chartData[chartData.length - 1].total; // Doanh thu tháng hiện tại (phần tử cuối mảng chart)
    const debtAmount = Number(currentDebt._sum.totalAmount) || 0;

    // 3. TRẢ VỀ CẤU TRÚC DỮ LIỆU CHUẨN CHO FRONTEND
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
        revenue: revenueAmount,     // Tiền đã thu thực tế tháng này
        debt: debtAmount,           // Tiền khách còn nợ tháng này
        totalExpected: revenueAmount + debtAmount, // Doanh thu lý tưởng
        chartData: chartData        // Mảng 6 tháng dùng cho biểu đồ BarChart
      }
    };
  }
}