import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  avatar?: string; // Cho phép update Avatar

  // Lưu ý: Không cho phép update fingerprintId hay faceDescriptor ở đây
  // Những cái đó phải qua API riêng của module AI/IoT
}