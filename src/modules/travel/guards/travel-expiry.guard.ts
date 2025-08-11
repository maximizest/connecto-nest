import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel, TravelStatus } from '../travel.entity';

/**
 * Travel 만료 체크 Guard
 * 만료된 Travel에 대한 접근을 차단
 */
@Injectable()
export class TravelExpiryGuard implements CanActivate {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const travelId = this.extractTravelId(request);

    if (!travelId) {
      throw new BadRequestException('Travel ID가 필요합니다.');
    }

    // Travel 조회
    const travel = await this.travelRepository.findOne({
      where: { id: travelId },
    });

    if (!travel) {
      throw new ForbiddenException('Travel을 찾을 수 없습니다.');
    }

    // 만료 상태 체크
    if (travel.isExpired() || travel.status === TravelStatus.EXPIRED) {
      const expiryStatus = travel.getExpiryStatus();
      throw new ForbiddenException(
        `이 Travel은 만료되었습니다. (만료일: ${expiryStatus.expiryDate.toLocaleString('ko-KR')})`,
      );
    }

    // 비활성 상태 체크
    if (!travel.isActive) {
      throw new ForbiddenException('이 Travel은 비활성 상태입니다.');
    }

    // 취소된 상태 체크
    if (travel.status === TravelStatus.CANCELLED) {
      throw new ForbiddenException('이 Travel은 취소되었습니다.');
    }

    return true;
  }

  /**
   * 요청에서 Travel ID 추출
   */
  private extractTravelId(request: any): number | null {
    // URL 파라미터에서 travelId 추출
    const travelId = request.params?.travelId || request.params?.id;

    // body에서 travelId 추출
    const bodyTravelId = request.body?.travelId;

    // query에서 travelId 추출
    const queryTravelId = request.query?.travelId;

    const id = travelId || bodyTravelId || queryTravelId;
    return id ? parseInt(id, 10) : null;
  }
}
