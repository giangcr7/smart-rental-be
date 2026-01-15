import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Upload - Tải ảnh')
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @ApiOperation({ summary: 'Upload 1 file ảnh -> Trả về URL (Có thể chọn folder)' })
  @ApiConsumes('multipart/form-data') // Báo cho Swagger biết đây là upload file
  
  // 1. Thêm cái này để Swagger hiện ô nhập folder cho Giang test
  @ApiQuery({ 
    name: 'folder', 
    required: false, 
    description: 'Tên thư mục con trên Cloud (VD: rooms, avatars, contracts)', 
    example: 'rooms' 
  })
  
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file')) // 'file' là tên key trong Postman
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'others' // <--- 2. MỚI: Nhận tham số folder (Mặc định là 'others')
  ) {
    if (!file) {
      throw new BadRequestException('Chưa chọn file ảnh!');
    }
    
    // 3. Gọi service upload kèm theo tên folder (Giang nhớ update cả bên Service nhé)
    const result = await this.cloudinaryService.uploadFile(file, folder);
    
    // Trả về URL ảnh
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  }
}