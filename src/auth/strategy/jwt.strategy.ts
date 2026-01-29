import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    // Payload lúc này đã chứa: { sub, email, role, branchId } từ AuthService
    
    // Tìm user trong DB để đảm bảo tính xác thực mới nhất
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        deletedAt: true,
      }
    });
    
    // 1. Chặn nếu user không tồn tại hoặc đã bị xóa mềm
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa');
    }

    // 2. Chặn nếu tài khoản bị khóa (Ví dụ do nợ phí)
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đang bị tạm khóa');
    }

    // 3. QUAN TRỌNG: Gán thêm branchId từ Payload vào object trả về
    // Đối tượng này chính là req.user trong các Controller
    return {
      ...user,
      branchId: payload.branchId, // Bây giờ req.user.branchId sẽ khả dụng!
    };
  }
}