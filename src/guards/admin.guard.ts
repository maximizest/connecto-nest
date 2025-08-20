import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { User } from '../modules/user/user.entity';
import { UserRole } from '../modules/user/enums/user-role.enum';
import { AuthGuard } from './auth.guard';

/**
 * Admin Guard
 *
 * AuthGuard를 먼저 실행한 후 ADMIN 권한을 확인합니다.
 * 이미 AuthGuard에서 모든 인증/블랙리스트 검증이 완료되었으므로
 * 여기서는 role 확인만 수행합니다.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 먼저 AuthGuard 실행 (JWT 검증, 블랙리스트 확인, 차단 상태 확인)
    const isAuthenticated = await this.authGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as any).user as CurrentUserData;

    // 데이터베이스에서 사용자 role 확인
    const user = await User.findOne({
      where: { id: payload.id },
      select: ['id', 'email', 'role'],
    });

    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다');
    }

    // ADMIN 역할 확인
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return true;
  }
}
