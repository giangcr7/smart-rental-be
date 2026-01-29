import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. TẠO USER MỚI
  async create(createUserDto: CreateUserDto) {
    const exist = await this.prisma.user.findFirst({ 
      where: { email: createUserDto.email, deletedAt: null } 
    });
    if (exist) throw new BadRequestException('Email đã tồn tại!');

    const hashedPassword = await bcrypt.hash(createUserDto.password || '123456', 10);

    return this.prisma.user.create({
      data: { 
        ...createUserDto, 
        password: hashedPassword,
        isActive: true // Mặc định mở khóa khi tạo mới
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true }
    });
  }

  // 2. LẤY DANH SÁCH (Bổ sung isActive để FE hiển thị ổ khóa)
  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true, // QUAN TRỌNG: Trả về để hiện Badge xanh/đỏ
        fingerprintId: true, 
        faceDescriptor: true,
      }
    });
  }

  // 3. XEM CHI TIẾT
  async findOne(id: number, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền xem thông tin người khác');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) throw new NotFoundException('User không tồn tại');

    const { password, ...result } = user;
    return result; 
  }

  // 4. CẬP NHẬT THÔNG TIN
  async update(id: number, updateUserDto: UpdateUserDto, currentUser: any) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existingUser) throw new NotFoundException('User không tồn tại');

    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Không có quyền sửa thông tin người khác');
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

  // 5. KHÓA/MỞ KHÓA THỦ CÔNG (ADMIN VẶN Ổ KHÓA)
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

  // 6. TỰ ĐỘNG KHÓA KHI HẾT HẠP ĐỒNG (CRON JOB)
  // Quét vào lúc 00:00 mỗi ngày
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoLockExpiredContracts() {
    console.log('--- [Hệ thống] Bắt đầu quét hợp đồng hết hạn để khóa tài khoản ---');
    const now = new Date();

    // Tìm những Tenant đang hoạt động nhưng tất cả hợp đồng đã kết thúc
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        role: Role.TENANT,
        isActive: true,
        deletedAt: null,
        contracts: {
          every: {
            endDate: { lt: now },
          },
        },
      },
    });

    if (expiredUsers.length > 0) {
      const idsToLock = expiredUsers.map(u => u.id);
      await this.prisma.user.updateMany({
        where: { id: { in: idsToLock } },
        data: { isActive: false },
      });
      console.log(`✅ Đã khóa tự động ${idsToLock.length} tài khoản.`);
    }
  }

  // 7. XÓA MỀM (CHO VÀO THÙNG RÁC)
  async remove(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User không tồn tại');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 8. THÙNG RÁC & KHÔI PHỤC
  async findDeleted() {
    return this.prisma.user.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, fullName: true, email: true, deletedAt: true }
    });
  }

  async restore(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}