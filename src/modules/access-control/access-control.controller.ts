import { 
  Controller, Post, Get, Param, UploadedFile, UseInterceptors, 
  ParseIntPipe, BadRequestException, Query, Headers 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessControlService } from './access-control.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';

@ApiTags('Access Control - Quản lý ra vào AI')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  // 1. LẤY NHẬT KÝ RA VÀO (ĐÃ LỌC THEO CHI NHÁNH)
  @Get('logs/recent')
  @ApiOperation({ 
    summary: 'Lấy nhật ký ra vào mới nhất',
    description: 'Tự động lọc theo chi nhánh nếu có branchId truyền vào' 
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID chi nhánh để lọc log' })
  async getRecentLogs(
    @Query('limit') limit: string,
    @Query('branchId') branchId?: string, // Thêm filter chi nhánh cho Admin
  ) {
    const take = limit ? parseInt(limit) : 10;
    const bId = branchId ? parseInt(branchId) : undefined;
    return this.accessControlService.getRecentLogs(take, bId);
  }

  // 2. XÁC THỰC MẶT (NGĂN CHẶN SAI CHI NHÁNH)
  @Post('verify-face')
  @ApiOperation({ 
    summary: 'Nhận diện khuôn mặt để mở cổng',
    description: 'Yêu cầu truyền X-Device-ID ở Header để xác định chi nhánh' 
  })
  @ApiHeader({
    name: 'x-device-id',
    description: 'ID của thiết bị/camera (ví dụ: CAM_01_CO_GIAY)',
    required: true
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Ảnh chụp từ camera' },
      },
    },
  })
  async checkIn(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-device-id') deviceId: string // Lấy ID thiết bị từ Header
  ) {
    if (!file) throw new BadRequestException('Vui lòng cung cấp file ảnh chụp từ camera');
    if (!deviceId) throw new BadRequestException('Không xác định được thiết bị đầu cuối (Missing Device ID)');
    
    // Gọi Service đã được điều chỉnh để check chi nhánh
    return this.accessControlService.verifyFaceWithAI(file, deviceId);
  }

  // 3. ĐĂNG KÝ (DÙNG CHUNG TOÀN HỆ THỐNG)
  @Post('register-face/:userId')
  @ApiOperation({ summary: 'Đăng ký khuôn mặt cho cư dân' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Ảnh chân dung đăng ký' },
      },
    },
  })
  async registerFace(
    @Param('userId', ParseIntPipe) userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng cung cấp file ảnh chân dung để đăng ký');
    return this.accessControlService.registerFace(userId, file);
  }
}