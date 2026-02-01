import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsArray } from 'class-validator';
// 👇 1. Import thêm Type để ép kiểu
import { Type, Transform } from 'class-transformer'; 

export class CreateRoomDto {
  @ApiProperty({ example: 'P101', description: 'Số phòng/Tên phòng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên phòng không được để trống' })
  roomNumber: string;

  @ApiProperty({ example: 3500000, description: 'Giá thuê (VNĐ)' })
  @IsNotEmpty({ message: 'Giá phòng không được để trống' })
  @Type(() => Number) // 👈 2. BẮT BUỘC: Ép kiểu "5000000" -> 5000000
  @IsNumber({}, { message: 'Giá phòng phải là số' })
  @Min(0, { message: 'Giá phòng không được âm' })
  price: number;

  @ApiProperty({ example: 25.5, description: 'Diện tích (m2)' })
  @IsOptional()
  @Type(() => Number) // 👈 3. BẮT BUỘC: Ép kiểu "25.5" -> 25.5
  @IsNumber({}, { message: 'Diện tích phải là số' })
  area?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  image?: string;

  // --- CÁC TRƯỜNG MỚI ---

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  video?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  // 👇 4. Xử lý tiện ích (đề phòng Frontend gửi dạng JSON string hoặc mảng)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
        // Nếu gửi dạng "Wifi,Điều hòa" -> tách thành mảng
        return value.split(',').map(v => v.trim()); 
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true }) 
  utilities?: string[];

  // -----------------------------------------------------------

  @ApiProperty({ example: 1, description: 'ID của Khu trọ' })
  @IsNotEmpty({ message: 'ID chi nhánh không được để trống' })
  @Type(() => Number) // 👈 5. BẮT BUỘC: Ép kiểu "1" -> 1
  @IsNumber({}, { message: 'ID chi nhánh phải là số' })
  branchId: number;
}