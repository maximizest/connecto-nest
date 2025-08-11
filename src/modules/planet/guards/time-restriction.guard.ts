import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Planet } from '../planet.entity';

/**
 * Planet 시간 제한 체크 Guard
 * 지정된 시간에만 채팅할 수 있도록 제한
 */
@Injectable()
export class TimeRestrictionGuard implements CanActivate {
  constructor(
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const planetId = this.extractPlanetId(request);

    if (!planetId) {
      throw new BadRequestException('Planet ID가 필요합니다.');
    }

    // Planet 조회
    const planet = await this.planetRepository.findOne({
      where: { id: planetId, isActive: true },
    });

    if (!planet) {
      throw new ForbiddenException('Planet을 찾을 수 없습니다.');
    }

    // 시간 제한 체크
    const isChatAllowed = planet.isChatAllowed();

    if (!isChatAllowed) {
      const nextChatTime = planet.getNextChatTime();
      const nextChatTimeStr = nextChatTime
        ? `다음 채팅 가능 시간: ${nextChatTime.toLocaleString('ko-KR')}`
        : '';

      throw new ForbiddenException(
        `현재는 채팅할 수 있는 시간이 아닙니다. ${nextChatTimeStr}`.trim(),
      );
    }

    return true;
  }

  /**
   * 요청에서 Planet ID 추출
   */
  private extractPlanetId(request: any): number | null {
    // URL 파라미터에서 planetId 추출
    const planetId = request.params?.planetId || request.params?.id;

    // body에서 planetId 추출 (메시지 전송 등)
    const bodyPlanetId = request.body?.planetId;

    // query에서 planetId 추출
    const queryPlanetId = request.query?.planetId;

    const id = planetId || bodyPlanetId || queryPlanetId;
    return id ? parseInt(id, 10) : null;
  }
}
