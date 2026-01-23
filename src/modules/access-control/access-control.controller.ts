import { 
  Controller, Post, Param, UploadedFile, UseInterceptors, ParseIntPipe, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccessControlService } from './access-control.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Access Control - Quản lý ra vào AI')
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Post('verify-face')
  @ApiOperation({ summary: 'Nhận diện khuôn mặt để mở cổng' })
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
  async checkIn(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng cung cấp file ảnh chụp từ camera');
    return this.accessControlService.verifyFaceWithAI(file);
  }

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