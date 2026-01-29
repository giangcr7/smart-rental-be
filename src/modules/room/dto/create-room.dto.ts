import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsArray } from 'class-validator';

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

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg', 
    description: 'Link ảnh đại diện của phòng', 
    required: false 
  })
  @IsString()
  @IsOptional()
  image?: string;

  // --- CÁC TRƯỜNG MỚI BỔ SUNG ---

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/video/upload/v1/intro.mp4', 
    description: 'Link video quay thực tế căn phòng (URL)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  video?: string;

  @ApiProperty({ 
    example: 'Phòng đầy đủ ánh sáng, có cửa sổ lớn hướng Nam, an ninh tốt.', 
    description: 'Mô tả chi tiết về đặc điểm căn phòng', 
    required: false 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: ['Điều hòa', 'Máy giặt', 'Tủ lạnh', 'Wifi'], 
    description: 'Danh sách các tiện ích đi kèm phòng', 
    required: false,
    type: [String]
  })
  @IsArray({ message: 'Tiện ích phải là một danh sách các chuỗi' })
  @IsString({ each: true }) // Kiểm tra từng phần tử trong mảng phải là String
  @IsOptional()
  utilities?: string[];

  // -----------------------------------------------------------

  @ApiProperty({ example: 1, description: 'ID của Khu trọ chứa phòng này' })
  @IsNumber()
  @IsNotEmpty()
  branchId: number;
}