import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // 1. ĐĂNG KÝ (Dành cho Cư dân)
  async register(dto: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userExists) throw new ForbiddenException('Email đã tồn tại trong hệ thống');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          fullName: dto.fullName,
          phone: dto.phone,
          identityCard: dto.identityCard,
          role: Role.TENANT, 
        },
      });

      const { password, ...result } = user;
      return result;

    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Thông tin định danh (CCCD/Phone) đã tồn tại');
      }
      throw error;
    }
  }

  // 2. ĐĂNG NHẬP (Tích hợp tìm kiếm Chi nhánh quản lý)
  async login(dto: LoginDto) {
    // Tìm user kèm thông tin chi nhánh nếu là Admin
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc sai thông tin');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Mật khẩu không chính xác');

    // MỚI: Nếu là ADMIN, tìm chi nhánh mà họ đang quản lý (Dựa trên field manager trong bảng Branch)
    let managedBranchId: number | null = null;
    if (user.role === Role.ADMIN) {
      const branch = await this.prisma.branch.findFirst({
        where: { manager: user.fullName, deletedAt: null },
        select: { id: true }
      });
      managedBranchId = branch?.id || null;
    }

    return this.signToken(user.id, user.email, user.role, user.fullName, managedBranchId);
  }

  // Helper tạo JWT Token - Bổ sung branchId vào Payload
  async signToken(userId: number, email: string, role: Role, fullName: string, branchId: number | null) {
    const payload = {
      sub: userId,
      email,
      role,
      branchId, // Đưa ID chi nhánh vào Token để dùng cho các Guard về sau
    };

    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
      secret: secret,
    });

    return {
      access_token: token,
      userInfo: {
        id: userId,
        fullName: fullName,
        role: role,
        branchId: branchId, // Trả về để FE lưu vào Context/LocalStorage
      },
    };
  }
}