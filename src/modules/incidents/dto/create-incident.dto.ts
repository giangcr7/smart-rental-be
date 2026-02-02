// src/incidents/dto/create-incident.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';
import { IncidentPriority } from '@prisma/client';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  images?: string[]; // Danh sách link ảnh (VD: ["url1.jpg", "url2.jpg"])

  @IsEnum(IncidentPriority)
  @IsOptional()
  priority?: IncidentPriority; // Mức độ ưu tiên (LOW, MEDIUM, HIGH)
}