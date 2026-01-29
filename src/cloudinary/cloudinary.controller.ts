import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Req, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

@ApiTags('Upload - Tải lên Multimedia')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) 
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @ApiOperation({ summary: 'Upload Ảnh/Video (Tự động phân loại dựa trên quyền hạn)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', description: 'Thư mục lưu trữ (Chỉ Admin)' } // Chuyển folder vào Body
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folderBody: string, // Lấy folder từ Body để khớp với Frontend
    @Req() req: any 
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin để tải lên!');
    }

    // --- LOGIC PHÂN LOẠI THƯ MỤC AN TOÀN ---
    let targetFolder = folderBody || 'others';

    // Nếu không phải ADMIN, ép buộc vào thư mục riêng của cư dân
    if (req.user.role !== Role.ADMIN) {
        targetFolder = 'tenant_uploads'; 
    }

    // Thực hiện upload (Service đã có resource_type: 'auto' để trị lỗi Invalid image)
    const result = await this.cloudinaryService.uploadFile(file, targetFolder);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resource_type: result.resource_type, // Trả về 'image' hoặc 'video' để FE biết
      folder: targetFolder 
    };
  }
}