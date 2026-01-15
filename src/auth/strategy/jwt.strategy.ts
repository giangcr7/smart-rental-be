// src/auth/strategy/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
secretOrKey: config.get('JWT_SECRET') || 'secret_mac_dinh_cho_dev',
    });
  }

  async validate(payload: any) {
    // Payload đã decode: { sub: 1, email: '...', role: 'ADMIN', ... }
    
    // (Optional) Check kỹ xem user còn tồn tại trong DB không
    const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
    });
    
    // Nếu user bị xóa (soft delete), chặn luôn token cũ
    if (!user || user.deletedAt) return null;

    return user; // Gán user vào req.user
  }
}