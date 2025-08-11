import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PlanetAccessDeniedException,
  PlanetInactiveException,
  PlanetNotFoundException,
  TravelExpiredException,
  UserNotMemberException,
} from '../../../common/exceptions/business.exception';
import {
  PlanetUser,
  PlanetUserStatus,
} from '../../planet-user/planet-user.entity';
import { Planet, PlanetType } from '../../planet/planet.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../travel-user/travel-user.entity';
import { Travel } from '../../travel/travel.entity';
import { User } from '../../user/user.entity';

/**
 * Planet 접근 권한 Guard
 *
 * 메시지 관련 API에서 사용자가 해당 Planet에 접근할 권한이 있는지 확인합니다.
 *
 * 권한 규칙:
 * 1. GROUP 타입 Planet: Travel 멤버만 접근 가능
 * 2. DIRECT 타입 Planet: Planet에 직접 초대받은 사용자만 접근 가능
 * 3. 만료된 Travel의 Planet은 접근 불가
 * 4. 비활성화된 Planet은 접근 불가
 */
@Injectable()
export class PlanetAccessGuard implements CanActivate {
  private readonly logger = new Logger(PlanetAccessGuard.name);

  constructor(
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new PlanetAccessDeniedException('인증이 필요합니다.');
    }

    // Planet ID 추출 (body, params, query에서 확인)
    const planetId = this.extractPlanetId(request);

    if (!planetId) {
      throw new PlanetAccessDeniedException('Planet ID가 필요합니다.');
    }

    // Planet 정보 조회
    const planet = await this.planetRepository.findOne({
      where: { id: planetId },
      relations: ['travel'],
    });

    if (!planet) {
      throw new PlanetNotFoundException(planetId);
    }

    if (!planet.isActive) {
      throw new PlanetInactiveException(planetId);
    }

    // Travel 만료 확인
    if (planet.travel.isExpired()) {
      throw new TravelExpiredException(
        planet.travel.id,
        planet.travel.expiryDate,
      );
    }

    // Planet 타입별 접근 권한 확인
    switch (planet.type) {
      case PlanetType.GROUP:
        return await this.checkGroupPlanetAccess(user.id, planet);

      case PlanetType.DIRECT:
        return await this.checkDirectPlanetAccess(user.id, planet);

      default:
        this.logger.warn(`Unknown planet type: ${planet.type}`);
        return false;
    }
  }

  /**
   * Planet ID 추출
   */
  private extractPlanetId(request: any): number | null {
    // 1. Request body에서 확인
    if (request.body?.planetId) {
      return parseInt(request.body.planetId);
    }

    // 2. URL params에서 확인 (예: /messages/:planetId/...)
    if (request.params?.planetId) {
      return parseInt(request.params.planetId);
    }

    // 3. Query params에서 확인
    if (request.query?.planetId) {
      return parseInt(request.query.planetId);
    }

    // 4. Filter에서 확인 (nestjs-crud의 필터 형태)
    if (request.query?.['filter[planetId_eq]']) {
      return parseInt(request.query['filter[planetId_eq]']);
    }

    return null;
  }

  /**
   * GROUP 타입 Planet 접근 권한 확인
   */
  private async checkGroupPlanetAccess(
    userId: number,
    planet: Planet,
  ): Promise<boolean> {
    const travelUser = await this.travelUserRepository.findOne({
      where: {
        userId,
        travelId: planet.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!travelUser) {
      throw new UserNotMemberException('travel');
    }

    return true;
  }

  /**
   * DIRECT 타입 Planet 접근 권한 확인
   */
  private async checkDirectPlanetAccess(
    userId: number,
    planet: Planet,
  ): Promise<boolean> {
    const planetUser = await this.planetUserRepository.findOne({
      where: {
        userId,
        planetId: planet.id,
        status: PlanetUserStatus.ACTIVE,
      },
    });

    if (!planetUser) {
      throw new UserNotMemberException('planet');
    }

    return true;
  }
}
