import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ example: '2026-01-15T00:00:00.000Z', description: 'Ngày bắt đầu' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-07-15T00:00:00.000Z', description: 'Ngày kết thúc' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 3500000, description: 'Tiền cọc (VNĐ)' })
  @IsNumber()
  @Min(0)
  deposit: number;

  @ApiProperty({ example: 1, description: 'ID người thuê (User)' })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ example: 1, description: 'ID phòng (Room)' })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  // --- CẬP NHẬT MỚI: Ảnh hợp đồng ---
  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/contract-signed.jpg', 
    description: 'Ảnh chụp hợp đồng giấy đã ký (URL)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  scanImage?: string;
  // ----------------------------------
}