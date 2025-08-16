import { BeforeShow, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { PlanetUser, PlanetUserStatus } from '../../planet-user.entity';
import { PlanetUserService } from '../../planet-user.service';
import { Planet } from '../../../planet/planet.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../../travel-user/travel-user.entity';
import { User } from '../../../user/user.entity';

/**
 * PlanetUser API Controller (v1)
 *
 * Planet 멤버십 조회 전용 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Planet 멤버십 조회 (읽기 전용)
 * - 본인이 참여 중인 Planet 목록 확인
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 조회: 행성에 참여한 유저만 조회 가능
 * - 수정: 본인의 멤버십만 수정 가능
 * - 생성/삭제: 사용자는 직접 참여하거나 나갈 수 없음 (관리자 전용)
 *
 * 참고:
 * - 단체 Planet: Travel 참여 시 자동 참여됨
 * - 1:1 Planet: 관리자가 매칭하여 자동 참여됨
 * - 초대/수락/거절/나가기 기능 없음 (모든 Planet 관리는 관리자가 담당)
 */
@Controller({ path: 'planet-users', version: '1' })
@Crud({
  entity: PlanetUser,

  // 허용할 CRUD 액션 (조회, 수정만 가능 - 생성/삭제 불가)
  only: ['index', 'show', 'update'],

  // 필터링 허용 필드 (조회용)
  allowedFilters: ['planetId', 'status', 'joinedAt'],

  // Body에서 허용할 파라미터 (수정 시)
  allowedParams: [
    'notificationsEnabled', // 알림 활성화 여부
  ],

  // 관계 포함 허용 필드
  allowedIncludes: ['user', 'planet'],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 본인의 멤버십만 조회
    index: {
      allowedFilters: ['planetId', 'status', 'joinedAt'],
      allowedIncludes: ['user', 'planet'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['user', 'planet'],
    },

    // 수정: 본인 정보만 수정 가능
    update: {
      allowedParams: ['notificationsEnabled'],
    },
  },
})
@UseGuards(AuthGuard)
export class PlanetUserController {
  private readonly logger = new Logger(PlanetUserController.name);

  constructor(
    public readonly crudService: PlanetUserService,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
  ) {}

  /**
   * PlanetUser 조회 전 권한 확인 (행성에 참여한 유저만 조회 가능)
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    const planetUserId = parseInt(params.id, 10);

    // 조회하려는 PlanetUser 정보 가져오기
    const targetPlanetUser = await this.planetUserRepository.findOne({
      where: { id: planetUserId },
      relations: ['planet'],
    });

    if (!targetPlanetUser) {
      throw new NotFoundException('행성 멤버십을 찾을 수 없습니다.');
    }

    // 현재 유저가 해당 여행에 참여했는지 확인
    const userTravelMembership = await this.travelUserRepository.findOne({
      where: {
        travelId: targetPlanetUser.planet.travelId,
        userId: user.id,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!userTravelMembership) {
      throw new ForbiddenException(
        '행성에 참여한 유저만 멤버십 정보를 조회할 수 있습니다.',
      );
    }

    return params;
  }

  /**
   * PlanetUser 수정 전 권한 확인 (본인의 멤버십만 수정 가능)
   */
  @BeforeUpdate()
  async beforeUpdate(
    entity: PlanetUser,
    body: any,
    context: any,
  ): Promise<any> {
    const user: User = context.request?.user;

    // 본인의 멤버십만 수정 가능
    if (entity.userId !== user.id) {
      throw new ForbiddenException('본인의 멤버십 정보만 수정할 수 있습니다.');
    }

    // 중요한 필드는 수정 불가
    delete body.userId;
    delete body.planetId;
    delete body.status;
    delete body.joinedAt;

    return body;
  }
}
