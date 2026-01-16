import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // Import Role

// Import bảo vệ
import{ RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
@ApiTags('Statistics - Thống kê Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // 1. Kích hoạt bảo vệ
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN) // 2. CHỈ ADMIN MỚI ĐƯỢC XEM TIỀN
  @ApiOperation({ summary: 'Lấy số liệu tổng quan (Chỉ Admin)' })
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }
}