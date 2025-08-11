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
  PlanetUser,
  PlanetUserStatus,
} from '../../planet-user/planet-user.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../travel-user/travel-user.entity';
import { Travel } from '../../travel/travel.entity';
import { User } from '../../user/user.entity';
import { Planet, PlanetType } from '../planet.entity';

/**
 * Planet CRUD 접근 권한 Guard
 *
 * Planet 관련 CRUD API에서 사용자가 해당 Planet에 접근할 권한이 있는지 확인합니다.
 *
 * 권한 규칙:
 * 1. GROUP 타입 Planet: Travel 멤버만 조회 가능
 * 2. DIRECT 타입 Planet: Planet 멤버만 조회 가능
 * 3. Planet 생성/수정/삭제: 생성자만 가능
 * 4. 만료된 Travel의 Planet은 조회만 가능
 * 5. 비활성화된 Planet은 접근 불가
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
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // HTTP 메소드 확인
    const method = request.method;

    // Planet ID 추출
    const planetId = this.extractPlanetId(request);

    // Planet ID가 없는 경우 (목록 조회 등)
    if (!planetId) {
      // 생성(POST) 요청인 경우는 통과 (컨트롤러에서 권한 검사)
      if (method === 'POST') {
        return true;
      }

      // 목록 조회는 통과 (필터링은 컨트롤러에서 처리)
      return true;
    }

    // Planet 정보 조회
    const planet = await this.planetRepository.findOne({
      where: { id: planetId },
      relations: ['travel'],
    });

    if (!planet) {
      throw new NotFoundException('존재하지 않는 Planet입니다.');
    }

    // 비활성화된 Planet 확인 (생성자는 접근 가능)
    if (!planet.isActive && planet.createdBy !== user.id) {
      throw new ForbiddenException('비활성화된 Planet입니다.');
    }

    // 수정/삭제 권한: 생성자만 가능
    if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      if (planet.createdBy !== user.id) {
        throw new ForbiddenException('Planet 수정/삭제 권한이 없습니다.');
      }
      return true;
    }

    // 조회 권한 확인
    return await this.checkReadAccess(planet, user);
  }

  /**
   * Planet 조회 권한 확인
   */
  private async checkReadAccess(planet: Planet, user: User): Promise<boolean> {
    switch (planet.type) {
      case PlanetType.GROUP:
        return await this.checkGroupPlanetAccess(planet, user);

      case PlanetType.DIRECT:
        return await this.checkDirectPlanetAccess(planet, user);

      default:
        this.logger.warn(`Unknown planet type: ${planet.type}`);
        return false;
    }
  }

  /**
   * GROUP 타입 Planet 접근 권한 확인
   */
  private async checkGroupPlanetAccess(
    planet: Planet,
    user: User,
  ): Promise<boolean> {
    if (!planet.travelId) {
      throw new ForbiddenException('GROUP Planet은 Travel이 필요합니다.');
    }

    // Travel 만료 확인
    if (planet.travel && planet.travel.isExpired()) {
      throw new ForbiddenException('만료된 Travel의 Planet입니다.');
    }

    // Travel 멤버십 확인
    const travelUser = await this.travelUserRepository.findOne({
      where: {
        userId: user.id,
        travelId: planet.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!travelUser) {
      throw new ForbiddenException(
        'Travel 멤버만 이 Planet에 접근할 수 있습니다.',
      );
    }

    return true;
  }

  /**
   * DIRECT 타입 Planet 접근 권한 확인
   */
  private async checkDirectPlanetAccess(
    planet: Planet,
    user: User,
  ): Promise<boolean> {
    // Planet 멤버십 확인
    const planetUser = await this.planetUserRepository.findOne({
      where: {
        userId: user.id,
        planetId: planet.id,
        status: PlanetUserStatus.ACTIVE,
      },
    });

    if (!planetUser) {
      throw new ForbiddenException('이 1:1 Planet에 접근할 권한이 없습니다.');
    }

    return true;
  }

  /**
   * Planet ID 추출
   */
  private extractPlanetId(request: any): number | null {
    // 1. URL params에서 확인 (예: /planets/:id)
    if (request.params?.id) {
      return parseInt(request.params.id);
    }

    // 2. URL params에서 planetId 확인
    if (request.params?.planetId) {
      return parseInt(request.params.planetId);
    }

    // 3. Request body에서 확인 (생성 시)
    if (request.body?.planetId) {
      return parseInt(request.body.planetId);
    }

    // 4. Query params에서 확인
    if (request.query?.planetId) {
      return parseInt(request.query.planetId);
    }

    // 5. Filter에서 확인 (nestjs-crud의 필터 형태)
    if (request.query?.['filter[planetId_eq]']) {
      return parseInt(request.query['filter[planetId_eq]']);
    }

    return null;
  }
}
