import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Statistics - Thống kê Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy số liệu tổng quan cho trang chủ Dashboard' })
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }
}