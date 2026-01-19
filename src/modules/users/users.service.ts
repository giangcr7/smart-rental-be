import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo User mới (Hash password)
  async create(createUserDto: CreateUserDto) {
    // Check trùng email
    const exist = await this.prisma.user.findUnique({ where: { email: createUserDto.email } });
    if (exist) throw new BadRequestException('Email đã tồn tại!');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      // Trả về không có password
      select: { id: true, email: true, fullName: true, role: true, createdAt: true }
    });
  }

  // 2. Lấy danh sách (Admin only)
  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      // QUAN TRỌNG: Chỉ select những trường cần thiết để nhẹ API
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        fingerprintId: true, // Admin cần xem ai đã có vân tay
        // KHÔNG SELECT faceDescriptor (Nặng)
        // KHÔNG SELECT password (Bảo mật)
      }
    });
  }

  // 3. Xem chi tiết
  async findOne(id: number, currentUser: any) {
    // Logic bảo mật
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền xem thông tin người khác');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('User không tồn tại');

    // Loại bỏ password trước khi trả về
    const { password, ...result } = user;
    return result; 
  }

  // 4. Cập nhật
  async update(id: number, updateUserDto: UpdateUserDto, currentUser: any) {
    // Check quyền
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền sửa thông tin người khác');
    }

    // Nếu user thường mà đòi sửa Role -> Chặn
    if (currentUser.role !== Role.ADMIN && updateUserDto.role) {
       throw new ForbiddenException('Bạn không được phép tự thăng chức!');
    }

    // Nếu có đổi password -> Hash lại
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { password, ...result } = user;
    return result;
  }

  // 5. Xóa mềm (Admin only)
  async remove(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}