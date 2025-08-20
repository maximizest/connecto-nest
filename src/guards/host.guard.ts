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
import { TravelUser } from '../modules/travel-user/travel-user.entity';
import { TravelUserRole } from '../modules/travel-user/enums/travel-user-role.enum';
import { AuthGuard } from './auth.guard';

/**
 * Host Guard
 *
 * AuthGuard를 먼저 실행한 후 HOST 또는 ADMIN 권한을 확인합니다.
 * - ADMIN: 모든 Travel에 대한 권한
 * - HOST: 자신이 HOST인 Travel에 대한 권한만
 * 
 * Travel ID는 다음 우선순위로 추출:
 * 1. URL 파라미터의 travelId
 * 2. Request body의 travelId
 * 3. Query string의 travelId
 */
@Injectable()
export class HostGuard implements CanActivate {
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
    const payload = (request as any).user as CurrentUserData;

    // ADMIN은 모든 권한 허용
    if (user?.role === UserRole.ADMIN) {
      return true;
    }

    // Travel ID 추출 (다양한 소스에서)
    let travelId: number | undefined;
    
    // 1. URL 파라미터에서 travelId 추출
    if (request.params?.travelId) {
      travelId = parseInt(request.params.travelId as string, 10);
    }
    // 2. Body에서 travelId 추출
    else if (request.body?.travelId) {
      travelId = parseInt(request.body.travelId as string, 10);
    }
    // 3. Query string에서 travelId 추출
    else if (request.query?.travelId) {
      travelId = parseInt(request.query.travelId as string, 10);
    }

    // Travel ID가 없으면 권한 확인 불가
    if (!travelId || isNaN(travelId)) {
      throw new ForbiddenException('Travel ID가 필요합니다.');
    }

    // 사용자가 해당 Travel의 HOST인지 확인
    const travelUser = await TravelUser.findOne({
      where: { 
        userId: payload.id,
        travelId: travelId,
      },
      select: ['id', 'role', 'status'],
    });

    if (!travelUser) {
      throw new ForbiddenException('해당 Travel에 참여하지 않은 사용자입니다.');
    }

    // HOST 역할 확인
    if (travelUser.role !== TravelUserRole.HOST) {
      throw new ForbiddenException('호스트 권한이 필요합니다.');
    }

    // 추가로 request에 travelUser 정보 저장 (후속 처리에서 재사용 가능)
    (request as any).travelUser = travelUser;
    (request as any).travelId = travelId;

    return true;
  }
}