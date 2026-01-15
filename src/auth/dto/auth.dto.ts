// src/auth/dto/auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

// DTO cho Đăng ký
export class RegisterDto {
  @ApiProperty({ example: 'giang@gmail.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (Tối thiểu 6 ký tự)' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Lê Hoàng Giang', description: 'Họ và tên đầy đủ' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  @ApiProperty({ example: '0988888888', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '001200012345', required: false })
  @IsString()
  @IsOptional()
  identityCard?: string; // Số CCCD/CMND

  // --- CẬP NHẬT MỚI: Thêm trường Avatar ---
  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg', 
    description: 'Link ảnh đại diện (URL từ Cloudinary)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  avatar?: string;
  // ----------------------------------------
}

// DTO cho Đăng nhập (Giữ nguyên, không cần ảnh)
export class LoginDto {
  @ApiProperty({ example: 'giang@gmail.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}