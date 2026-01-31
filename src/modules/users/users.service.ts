import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly mailerService: MailerService, 
  ) {}

  // 1. TẠO USER MỚI: Đồng bộ dữ liệu AI và xử lý trùng lặp
  async create(createUserDto: CreateUserDto) {
    const exist = await this.prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: createUserDto.email },
          { identityCard: createUserDto.identityCard }
        ]
      } 
    });

    if (exist) {
      if (exist.deletedAt === null) {
        throw new BadRequestException('Thông tin Email hoặc CCCD này đang thuộc về cư dân đang hoạt động!');
      } else {
        throw new BadRequestException(
          'Hồ sơ này nằm trong Thùng rác. Hãy Khôi phục hoặc Xóa vĩnh viễn trước khi tạo mới!'
        );
      }
    }

    const rawPassword = createUserDto.password || '123456'; 
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Tách riêng các trường để đảm bảo Prisma nhận diện chính xác mảng số
    const { faceDescriptor, ...userData } = createUserDto;

    const user = await this.prisma.user.create({
      data: { 
        ...userData, 
        password: hashedPassword,
        isActive: true,
        // Đảm bảo luôn lưu mảng 128 số nếu có, nếu không khởi tạo mảng rỗng
        faceDescriptor: faceDescriptor && faceDescriptor.length > 0 ? faceDescriptor : []
      },
      include: { branch: true }
    });

    this.sendWelcomeEmail(user, rawPassword);
    const { password, ...result } = user;
    return result;
  }

  // 2. LẤY DANH SÁCH: Tự động lọc theo chi nhánh Admin
  async findAll(branchId?: number) {
    return this.prisma.user.findMany({
      where: { 
        deletedAt: null,
        role: Role.TENANT, 
        ...(branchId ? { branchId: Number(branchId) } : {}) 
      },
      include: {
        branch: { select: { name: true } },
        contracts: {
          where: { status: 'ACTIVE', deletedAt: null },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. XEM CHI TIẾT
  async findOne(id: number, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền xem thông tin người khác');
    }
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { branch: true }
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    const { password, ...result } = user;
    return result; 
  }

  // 4. CẬP NHẬT: Tiếp nhận dữ liệu từ nút "Quản lý AI"
  async update(id: number, updateUserDto: UpdateUserDto, currentUser: any) {
    const existingUser = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existingUser) throw new NotFoundException('User không tồn tại');

    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền sửa thông tin người khác');
    }

    if (updateUserDto.email || updateUserDto.identityCard) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: updateUserDto.email },
            { identityCard: updateUserDto.identityCard }
          ],
          NOT: { id } 
        }
      });
      if (conflict) throw new BadRequestException('Email hoặc CCCD mới đã tồn tại trong hệ thống!');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Cập nhật dữ liệu, bao gồm cả mảng faceDescriptor mới gửi từ FE
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        // Ép kiểu mảng để Prisma không nhầm lẫn
        ...(updateUserDto.faceDescriptor ? { faceDescriptor: updateUserDto.faceDescriptor } : {})
      },
    });
    const { password, ...result } = user;
    return result;
  }

  // 5. KHÓA/MỞ KHÓA
  async toggleUserStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (user.role === Role.ADMIN && isActive === false) {
      throw new BadRequestException('Không thể khóa tài khoản Admin!');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  // 6. XÓA MỀM & THÙNG RÁC
  async remove(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User không tồn tại');
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async findDeleted() {
    return this.prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, fullName: true, email: true, deletedAt: true }
    });
  }

  async restore(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
  }

  // 7. XÓA VĨNH VIỄN: Giải phóng Email/CCCD bị kẹt
  async hardDelete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    return this.prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({ where: { userId: id } }); 
      await tx.contract.deleteMany({ where: { userId: id } }); 
      await tx.accessLog.deleteMany({ where: { userId: id } }); 
      
      return tx.user.delete({ where: { id } });
    });
  }

  private async sendWelcomeEmail(user: any, rawPassword: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `[SmartHouse] Chào mừng cư dân: ${user.fullName}`,
        html: `<p>Tài khoản: <b>${user.email}</b><br>Mật khẩu: <b>${rawPassword}</b></p>`
      });
    } catch (e) { console.error('Lỗi gửi mail:', e.message); }
  }
}