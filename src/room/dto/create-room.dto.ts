import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'P101', description: 'Số phòng/Tên phòng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên phòng không được để trống' })
  roomNumber: string;

  @ApiProperty({ example: 3500000, description: 'Giá thuê (VNĐ)' })
  @IsNumber()
  @Min(0, { message: 'Giá phòng không được âm' })
  price: number;

  @ApiProperty({ example: 25.5, description: 'Diện tích (m2)' })
  @IsNumber()
  @IsOptional()
  area?: number;

  // --- CẬP NHẬT MỚI: Thêm trường nhận link ảnh ---
  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/v123456/room-p101.jpg', 
    description: 'Link ảnh thumbnail của phòng (URL từ Cloudinary)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  image?: string;
  // -----------------------------------------------

  @ApiProperty({ example: 1, description: 'ID của Khu trọ chứa phòng này' })
  @IsNumber()
  @IsNotEmpty()
  branchId: number;
}