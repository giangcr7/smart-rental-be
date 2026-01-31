import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  MinLength, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsArray 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'tenant@gmail.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  @ApiProperty({ example: '0987654321', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, default: Role.TENANT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ example: 1, description: 'ID của chi nhánh cư dân lưu trú', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Mã chi nhánh phải là số' })
  branchId?: number;

  @ApiProperty({ example: '0123456789', required: false })
  @IsOptional()
  @IsString()
  identityCard?: string;

  @ApiProperty({ example: 'https://image.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  // --- MẢNH GHÉP QUAN TRỌNG NHẤT: DỮ LIỆU FACEID ---
  @ApiProperty({ 
    example: [0.123, -0.456, 0.789], 
    description: 'Mảng 128 số đặc trưng khuôn mặt trích xuất từ AI',
    required: false 
  })
  @IsOptional()
  @IsArray({ message: 'Dữ liệu khuôn mặt phải là một mảng số' })
  faceDescriptor?: number[]; 
}