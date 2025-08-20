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
    
    // AuthGuard에서 이미 조회한 사용자 엔티티 재사용
    const user = (request as any).userEntity as User;

    // 사용자 정보가 없거나 role이 없는 경우만 재조회
    if (!user || !user.role) {
      const payload = (request as any).user as CurrentUserData;
      const dbUser = await User.findOne({
        where: { id: payload.id },
        select: ['id', 'email', 'role'],
      });
      
      if (!dbUser) {
        throw new ForbiddenException('사용자를 찾을 수 없습니다');
      }
      
      if (dbUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('관리자 권한이 필요합니다');
      }
      
      return true;
    }

    // 캐시된 사용자 정보에서 ADMIN 역할 확인
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다');
    }

    return true;
  }
}
