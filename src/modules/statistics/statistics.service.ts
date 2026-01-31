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
      ...(branchId && { branchId }),
    };

    // 1. KHAI BÁO KIỂU DỮ LIỆU CỤ THỂ
    const chartData: { name: string; total: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
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
          // Truy vấn lồng để lọc đúng chi nhánh
          room: branchId ? { is: { branchId: branchId } } : undefined, 
        },
      });

      chartData.push({
        name: `T${m}/${y.toString().slice(-2)}`,
        total: Number(monthlySum._sum.totalAmount) || 0,
      });
    }

    // 2. TRUY VẤN SONG SONG
    const [
      totalRooms,
      availableRooms,
      totalTenants,
      currentDebt
    ] = await Promise.all([
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
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: InvoiceStatus.UNPAID,
          month: currentMonth,
          year: currentYear,
          deletedAt: null,
          room: branchId ? { is: { branchId } } : undefined,
        },
      }),
    ]);

    const rentedRooms = totalRooms - availableRooms;

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
        revenue: chartData[chartData.length - 1].total,
        debt: Number(currentDebt._sum.totalAmount) || 0,
        chartData
      }
    };
  }
}