import { 
  Controller, Post, Get, Param, UploadedFile, UseInterceptors, 
  ParseIntPipe, BadRequestException, Query, Headers, 
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, DefaultValuePipe 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessControlService } from './access-control.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiQuery, ApiHeader, ApiResponse } from '@nestjs/swagger';

@ApiTags('Access Control - Quản lý ra vào AI')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}
  @Get('logs/recent')
  @ApiOperation({ summary: 'Lấy nhật ký ra vào mới nhất từ Database' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'branchId', required: false, example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách nhật ký được truy vấn thành công' })
  async getRecentLogs(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('branchId', new DefaultValuePipe(0), ParseIntPipe) branchId: number, 
  ) {
    const bId = branchId === 0 ? undefined : branchId;
    return this.accessControlService.getRecentLogs(limit, bId);
  }

  // 2. XÁC THỰC MẶT (CHECK-IN)
  @Post('verify-face')
  @ApiOperation({ summary: 'AI nhận diện khuôn mặt mở cổng' })
  @ApiHeader({ name: 'x-device-id', required: true, description: 'ID thiết bị Camera' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async checkIn(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), 
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }), 
        ],
      }),
    ) file: Express.Multer.File,
    @Headers('x-device-id') deviceId: string 
  ) {
    if (!deviceId) throw new BadRequestException('Vui lòng cung cấp X-Device-ID trong Header');
        return this.accessControlService.verifyFaceWithAI(file, deviceId);
  }

  // 3. ĐĂNG KÝ
  @Post('register-face/:userId')
  @ApiOperation({ summary: 'Đăng ký khuôn mặt FaceID cho cư dân' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async registerFace(
    @Param('userId', ParseIntPipe) userId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), 
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    ) file: Express.Multer.File,
  ) {
    return this.accessControlService.registerFace(userId, file);
  }
}