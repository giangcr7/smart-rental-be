// src/auth/auth.service.ts
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

  // 1. Đăng ký
  async register(dto: RegisterDto) {
    // Kiểm tra email trùng
    const userExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (userExists) throw new ForbiddenException('Email đã tồn tại trong hệ thống');

    // Hash mật khẩu
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

  // 2. Đăng nhập
  async login(dto: LoginDto) {
    // Tìm user theo email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc sai thông tin');
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Mật khẩu không chính xác');

    // Gọi hàm tạo token (truyền fullName vào để trả về cho Client)
    return this.signToken(user.id, user.email, user.role, user.fullName);
  }

  // Helper tạo JWT Token
  async signToken(userId: number, email: string, role: Role, fullName: string) {
    const payload = {
      sub: userId,
      email,
      role,
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
      },
    };
  }
}