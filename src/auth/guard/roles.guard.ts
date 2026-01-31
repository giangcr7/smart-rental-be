import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator'; // <--- 1. Import cái này

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // --- 2. THÊM ĐOẠN CHECK PUBLIC NÀY ---
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Nếu route này là Public thì bỏ qua check Role -> Return true luôn
    if (isPublic) {
      return true;
    }
    // -------------------------------------

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không yêu cầu Role cụ thể nào -> Cho qua
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    
    // Check an toàn: Nếu không có user (chưa login) mà lại đòi quyền -> Chặn
    if (!user) return false; 

    return requiredRoles.some((role) => user.role === role);
  }
}