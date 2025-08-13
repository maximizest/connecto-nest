import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TravelUser,
  TravelUserStatus,
} from '../../travel-user/travel-user.entity';
import { User } from '../../user/user.entity';
import { Travel, TravelStatus, TravelVisibility } from '../travel.entity';

/**
 * Travel 접근 권한 Guard
 *
 * Travel 관련 API에서 사용자가 해당 Travel에 접근할 권한이 있는지 확인합니다.
 *
 * 권한 규칙:
 * 1. Travel 멤버만 접근 가능
 * 2. 만료된 Travel은 조회만 가능 (수정 불가)
 * 3. CANCELLED/EXPIRED 상태의 Travel은 소유자만 접근 가능
 * 4. 공개 Travel은 누구나 조회 가능
 */
@Injectable()
export class TravelAccessGuard implements CanActivate {
  private readonly logger = new Logger(TravelAccessGuard.name);

  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // Travel ID 추출 (params, body, query에서 확인)
    const travelId = this.extractTravelId(request);

    if (!travelId) {
      // Travel ID가 없는 경우 (목록 조회 등)는 통과
      return true;
    }

    // Travel 정보 조회
    const travel = await this.travelRepository.findOne({
      where: { id: travelId },
      relations: ['creator'],
    });

    if (!travel) {
      throw new NotFoundException('존재하지 않는 Travel입니다.');
    }

    // HTTP 메소드 확인
    const method = request.method;

    // 공개 Travel의 경우 조회(GET)는 누구나 가능
    if (method === 'GET' && travel.visibility === TravelVisibility.PUBLIC) {
      return true;
    }

    // Travel 멤버십 확인
    const travelUser = await this.travelUserRepository.findOne({
      where: {
        userId: user.id,
        travelId: travel.id,
        status: TravelUserStatus.ACTIVE,
      },
    });

    // Travel 멤버가 아닌 경우
    if (!travelUser) {
      // Travel은 Admin이 생성하므로 일반 사용자는 소유자가 될 수 없음
      // (멤버가 아니면 접근 불가)

      throw new ForbiddenException('이 Travel에 접근할 권한이 없습니다.');
    }

    // 만료된 Travel 확인 (조회만 허용, 수정 불가)
    if (travel.isExpired() && method !== 'GET') {
      throw new ForbiddenException('만료된 Travel은 조회만 가능합니다.');
    }

    // 비활성된 Travel 확인 (Admin이 생성하므로 일반 사용자는 수정 불가)
    if (travel.status === TravelStatus.INACTIVE && method !== 'GET') {
      throw new ForbiddenException(
        '비활성된 Travel은 관리자만 수정할 수 있습니다.',
      );
    }

    return true;
  }

  /**
   * Travel ID 추출
   */
  private extractTravelId(request: any): number | null {
    // 1. URL params에서 확인 (예: /travels/:id/...)
    if (request.params?.id) {
      return parseInt(request.params.id);
    }

    // 2. URL params에서 travelId 확인
    if (request.params?.travelId) {
      return parseInt(request.params.travelId);
    }

    // 3. Request body에서 확인
    if (request.body?.travelId) {
      return parseInt(request.body.travelId);
    }

    // 4. Query params에서 확인
    if (request.query?.travelId) {
      return parseInt(request.query.travelId);
    }

    // 5. Filter에서 확인 (nestjs-crud의 필터 형태)
    if (request.query?.['filter[travelId_eq]']) {
      return parseInt(request.query['filter[travelId_eq]']);
    }

    return null;
  }
}
