import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    // 1. Đếm tổng số khu trọ
    const totalBranches = await this.prisma.branch.count({ where: { deletedAt: null } });

    // 2. Đếm tổng số phòng & Số phòng trống
    const totalRooms = await this.prisma.room.count({ where: { deletedAt: null } });
    const availableRooms = await this.prisma.room.count({ 
      where: { status: RoomStatus.AVAILABLE, deletedAt: null } 
    });
    const rentedRooms = totalRooms - availableRooms;

    // 3. Đếm số khách thuê (User role TENANT)
    const totalTenants = await this.prisma.user.count({
      where: { role: 'TENANT', deletedAt: null }
    });

    // 4. Tính doanh thu tháng này (Dựa trên hóa đơn đã PAID)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const revenueData = await this.prisma.invoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: InvoiceStatus.PAID,
        month: currentMonth,
        year: currentYear,
        deletedAt: null,
      },
    });

    return {
      branches: totalBranches,
      rooms: {
        total: totalRooms,
        available: availableRooms,
        rented: rentedRooms,
        occupancyRate: totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0 // Tỉ lệ lấp đầy (%)
      },
      tenants: totalTenants,
      revenue: {
        month: currentMonth,
        year: currentYear,
        total: revenueData._sum.totalAmount || 0, // Nếu không có hóa đơn nào thì trả về 0
      }
    };
  }
}