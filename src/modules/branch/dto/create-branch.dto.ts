import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Nhà trọ Hạnh Phúc - CS1', description: 'Tên khu trọ' })
  @IsString()
  @IsNotEmpty({ message: 'Tên khu trọ không được để trống' })
  name: string;

  @ApiProperty({ example: '123 Đường Láng, Hà Nội', description: 'Địa chỉ' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  address: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người quản lý' })
  @IsString()
  @IsNotEmpty({ message: 'Tên người quản lý không được để trống' })
  manager: string;

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/demo/image/upload/v123456/branch-cs1.jpg', 
    description: 'Ảnh cổng hoặc ảnh đại diện khu trọ (URL)', 
    required: false 
  })
  @IsString()
  @IsOptional() 
  image?: string;
}