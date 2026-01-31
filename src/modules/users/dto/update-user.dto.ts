// src/modules/users/dto/update-user.dto.ts

import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'https://image.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  // Đảm bảo UpdateUserDto chấp nhận mảng số từ nút Quản lý AI
  @ApiProperty({ example: [0.1, -0.2, 0.5], required: false })
  @IsOptional()
  @IsArray({ message: 'Dữ liệu khuôn mặt phải là một mảng số' })
  faceDescriptor?: number[]; 
}