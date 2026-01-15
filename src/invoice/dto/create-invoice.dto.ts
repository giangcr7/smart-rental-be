import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ example: 1, description: 'ID của phòng cần tính tiền' })
  @IsNotEmpty()
  @IsNumber()
  roomId: number;

  @ApiProperty({ example: 1, description: 'Tháng (1-12)' })
  @IsNumber()
  @Min(1)
  month: number;

  @ApiProperty({ example: 2026, description: 'Năm' })
  @IsNumber()
  year: number;

  // --- ĐIỆN ---
  @ApiProperty({ example: 100, description: 'Số điện cũ (kWh)' })
  @IsNumber()
  @Min(0)
  oldElectricity: number;

  @ApiProperty({ example: 150, description: 'Số điện mới (kWh)' })
  @IsNumber()
  @Min(0)
  newElectricity: number;

  // --- NƯỚC ---
  @ApiProperty({ example: 50, description: 'Số nước cũ (m3)' })
  @IsNumber()
  @Min(0)
  oldWater: number;

  @ApiProperty({ example: 55, description: 'Số nước mới (m3)' })
  @IsNumber()
  @Min(0)
  newWater: number;

  @ApiProperty({ example: 100000, description: 'Phí dịch vụ khác (Rác, wifi...)' })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  // --- CẬP NHẬT MỚI: Ảnh minh chứng thanh toán ---
  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/bill-ck.jpg', 
    description: 'Ảnh chụp màn hình chuyển khoản (URL)', 
    required: false 
  })
  @IsString()
  @IsOptional() // Không bắt buộc lúc tạo mới (vì thường tạo xong mới trả tiền)
  paymentProof?: string;
  // -----------------------------------------------
}