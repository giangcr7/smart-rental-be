import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Tạo User mới
  async create(createUserDto: CreateUserDto) {
    const exist = await this.prisma.user.findFirst({ 
      where: { email: createUserDto.email, deletedAt: null } // Kiểm tra email trong những user đang hoạt động
    });
    if (exist) throw new BadRequestException('Email đã tồn tại!');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: { ...createUserDto, password: hashedPassword },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true }
    });
  }

  // 2. Lấy danh sách (Admin only)
  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null }, // Đã có lọc xóa mềm
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        fingerprintId: true, 
        faceDescriptor: true,
      }
    });
  }

  // 3. Xem chi tiết (Cập nhật để chặn xem User đã xóa)
  async findOne(id: number, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền xem thông tin người khác');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }, // PHẢI thêm deletedAt: null ở đây
    });

    if (!user) throw new NotFoundException('User không tồn tại hoặc đã bị xóa');

    const { password, ...result } = user;
    return result; 
  }

  // 4. Cập nhật (Cập nhật để chặn sửa User đã xóa)
  async update(id: number, updateUserDto: UpdateUserDto, currentUser: any) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existingUser) throw new NotFoundException('User không tồn tại hoặc đã bị xóa');

    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền sửa thông tin người khác');
    }

    if (currentUser.role !== Role.ADMIN && updateUserDto.role) {
       throw new ForbiddenException('Bạn không được phép tự thăng chức!');
    }

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

  // 5. Xóa mềm (Đảm bảo không xóa người đã xóa rồi)
  async remove(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!user) throw new NotFoundException('User không tồn tại hoặc đã bị xóa từ trước');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

// 6. Lấy danh sách đã bị xóa mềm (Dùng cho Thùng rác)
async findDeleted() {
  return this.prisma.user.findMany({
    where: { 
      deletedAt: { not: null } // Lấy những người có ngày xóa khác null
    },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      deletedAt: true, // Trả về ngày xóa để UI hiển thị
    }
  });
}

// 7. Khôi phục người dùng
async restore(id: number) {
  const user = await this.prisma.user.findFirst({
    where: { id, deletedAt: { not: null } }
  });
  if (!user) throw new NotFoundException('Không tìm thấy người dùng này trong thùng rác');

  return this.prisma.user.update({
    where: { id },
    data: { deletedAt: null }, // Sét lại về null để "hồi sinh"
  });
}

// 8. Xóa vĩnh viễn khỏi Database
async hardDelete(id: number) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException('Người dùng không tồn tại');

  return this.prisma.user.delete({
    where: { id },
  });
}
}