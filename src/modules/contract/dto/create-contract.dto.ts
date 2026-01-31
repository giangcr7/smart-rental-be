// src/modules/contracts/dto/create-contract.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreateContractDto {
  // BỔ SUNG: Trường này để nhận diện chi nhánh từ Modal gửi lên
  @ApiProperty({ example: 1, description: 'ID Chi nhánh' })
  @IsNumber()
  @IsNotEmpty({ message: 'Chi nhánh không được để trống' })
  branchId: number; 

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

  @ApiProperty({ 
    example: 'https://image.com/contract-signed.jpg', 
    description: 'Ảnh chụp hợp đồng giấy (URL)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  scanImage?: string;
}