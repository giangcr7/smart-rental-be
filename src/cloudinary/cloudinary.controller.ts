import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client'; // Import Role

@ApiTags('Upload - Tải ảnh')
@ApiBearerAuth() // Hiện nút khóa trên Swagger
@UseGuards(AuthGuard('jwt')) // <--- CHỐT CHẶN 1: Phải đăng nhập mới được Upload
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @ApiOperation({ summary: 'Upload file ảnh (Admin chọn folder, Tenant tự động vào avatars/payment)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ 
    name: 'folder', 
    required: false, 
    description: 'Tên thư mục (Chỉ Admin mới có tác dụng)', 
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folderQuery: string = 'others', // Folder do người dùng gửi lên
    @Req() req: any // <--- Lấy thông tin người dùng đang đăng nhập
  ) {
    if (!file) {
      throw new BadRequestException('Chưa chọn file ảnh!');
    }

    // --- LOGIC BẢO MẬT FOLDER (CHỐT CHẶN 2) ---
    let targetFolder = folderQuery;

    // Nếu là TENANT -> Ép cứng folder, không cho chọn linh tinh
    // Tenant chỉ được up ảnh đại diện hoặc ảnh chuyển khoản
    if (req.user.role === Role.TENANT) {
        // Tùy logic của bạn, ví dụ ép hết vào 'tenant_uploads' cho an toàn
        targetFolder = 'tenant_uploads'; 
    }
    
    // Nếu là ADMIN -> Giữ nguyên folder họ muốn (rooms, contracts, branches...)

    // Gọi service
    const result = await this.cloudinaryService.uploadFile(file, targetFolder);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      folder: targetFolder // Trả về để biết rốt cuộc nó nằm ở đâu
    };
  }
}