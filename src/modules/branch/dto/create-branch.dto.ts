import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ 
    example: 'SmartHouse Cầu Giấy', 
    description: 'Tên khu trọ (Dùng để định danh thiết bị AI)' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên khu trọ không được để trống' })
  @MinLength(3, { message: 'Tên khu trọ phải có ít nhất 3 ký tự' }) // Đảm bảo tên đủ rõ ràng cho AI
  name: string;

  @ApiProperty({ example: '123 Đường Láng, Hà Nội', description: 'Địa chỉ chi tiết' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @ApiProperty({ example: 'Lê Hoàng Giang', description: 'Tên người quản lý chi nhánh' })
  @IsString()
  @IsNotEmpty({ message: 'Tên người quản lý không được để trống' })
  manager: string;

  @ApiProperty({ 
    example: 'https://images.unsplash.com/photo-1554995207-c18c203602cb', 
    description: 'URL ảnh đại diện khu trọ', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' }) // Kiểm tra định dạng URL chuẩn
  image?: string;
}