import { Controller, Get, UseGuards, Query } from '@nestjs/common'; // Thêm Query
import { StatisticsService } from './statistics.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorator/roles.decorator';

@ApiTags('Statistics - Thống kê Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy số liệu tổng quan (Lọc theo chi nhánh)' })
  @ApiQuery({ name: 'branchId', required: false, type: Number }) // Swagger documentation
  getDashboardStats(@Query('branchId') branchId?: string) {
    // Chuyển đổi branchId từ string sang number trước khi đưa vào Service
    const branchIdNum = branchId ? Number(branchId) : undefined;
    return this.statisticsService.getDashboardStats(branchIdNum);
  }
}