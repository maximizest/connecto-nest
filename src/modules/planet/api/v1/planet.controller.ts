import {
  AfterCreate,
  AfterUpdate,
  BeforeCreate,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  PlanetUser,
  PlanetUserRole,
  PlanetUserStatus,
} from '../../../planet-user/planet-user.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../../travel-user/travel-user.entity';
import { Travel } from '../../../travel/travel.entity';
import { User } from '../../../user/user.entity';
import { PlanetAccessGuard } from '../../guards/planet-access.guard';
import { Planet, PlanetType } from '../../planet.entity';
import { PlanetService } from '../../planet.service';

/**
 * Planet API Controller (v1)
 *
 * Planet(채팅방) CRUD 작업을 수행합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - 단체 Planet 생성 (Travel 멤버 모두 참여)
 * - 1:1 Planet 생성 (직접 초대 필요)
 * - Planet 설정 관리 (시간 제한, 파일 업로드 등)
 * - Travel 연결 관리
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - Planet 생성: Travel 멤버만 가능 (GROUP) / 누구나 가능 (DIRECT)
 * - Planet 수정: Planet 생성자만 가능
 * - Planet 조회: 권한 있는 사용자만 가능
 */
@Controller({ path: 'planets', version: '1' })
@Crud({
  entity: Planet,

  // 허용할 CRUD 액션
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: [
    'travelId',
    'type',
    'createdBy',
    'isActive',
    'name',
    'createdAt',
  ],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'name',
    'description',
    'type',
    'travelId',
    'imageUrl',
    'settings',
    'timeRestriction',
    'isActive', // 관리자용
  ],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'creator',
    'travel',
    'messages',
    'directMembers', // PlanetUser (1:1 Planet용)
    'directMembers.user',
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Travel 범위로 제한
    index: {
      allowedFilters: [
        'travelId', // 필수 필터 (사용자 속한 Travel만)
        'type',
        'isActive',
        'name',
        'createdAt',
      ],
      allowedIncludes: ['creator', 'travel'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: [
        'creator',
        'travel',
        'directMembers',
        'directMembers.user',
      ],
    },

    // 생성: 타입별 권한 확인
    create: {
      allowedParams: [
        'name',
        'description',
        'type',
        'travelId', // GROUP Planet은 필수
        'imageUrl',
        'settings',
        'timeRestriction',
      ],
    },

    // 수정: 생성자만 허용
    update: {
      allowedParams: [
        'name',
        'description',
        'imageUrl',
        'settings',
        'timeRestriction',
        'isActive', // 비활성화 가능
      ],
    },
  },
})
@UseGuards(AuthGuard, PlanetAccessGuard)
export class PlanetController {
  private readonly logger = new Logger(PlanetController.name);

  constructor(
    public readonly crudService: PlanetService,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {}

  /**
   * Planet 생성 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;

    // 기본값 설정
    body.createdBy = user.id;
    body.isActive = true;
    body.messageCount = 0;
    body.memberCount = 0; // 후에 업데이트됨

    // Planet 타입별 검증
    switch (body.type) {
      case PlanetType.GROUP:
        await this.validateGroupPlanetCreation(body, user);
        break;

      case PlanetType.DIRECT:
        await this.validateDirectPlanetCreation(body, user);
        break;

      default:
        throw new ForbiddenException('지원하지 않는 Planet 타입입니다.');
    }

    // 설정 기본값
    if (!body.settings) {
      body.settings = {
        allowFileUpload: true,
        maxFileSize: 500 * 1024 * 1024, // 500MB
        allowedFileTypes: ['image', 'video', 'file'],
        messageRetentionDays: 365,
        allowMentions: true,
        allowReactions: true,
      };
    }

    this.logger.log(
      `Creating planet: name=${body.name}, type=${body.type}, travelId=${body.travelId}, createdBy=${body.createdBy}`,
    );

    return body;
  }

  /**
   * Planet 생성 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: Planet, @Request() req: any): Promise<Planet> {
    const user: User = req.user;

    try {
      if (entity.type === PlanetType.GROUP && entity.travelId) {
        // GROUP Planet: Travel 멤버 수로 memberCount 업데이트
        const travelMemberCount = await this.travelUserRepository.count({
          where: {
            travelId: entity.travelId,
            status: TravelUserStatus.ACTIVE,
          },
        });

        await this.planetRepository.update(entity.id, {
          memberCount: travelMemberCount,
        });

        // Travel의 planetCount 증가
        await this.travelRepository.increment(
          { id: entity.travelId },
          'planetCount',
          1,
        );

        entity.memberCount = travelMemberCount;

        this.logger.log(
          `Group planet created: id=${entity.id}, memberCount=${travelMemberCount}`,
        );
      } else if (entity.type === PlanetType.DIRECT) {
        // DIRECT Planet: 생성자를 멤버로 추가
        const planetUser = this.planetUserRepository.create({
          planetId: entity.id,
          userId: user.id,
          status: PlanetUserStatus.ACTIVE,
          role: PlanetUserRole.CREATOR,
          joinedAt: new Date(),
          invitedBy: user.id,
        });

        await this.planetUserRepository.save(planetUser);

        await this.planetRepository.update(entity.id, {
          memberCount: 1,
        });

        entity.memberCount = 1;

        this.logger.log(
          `Direct planet created: id=${entity.id}, owner=${user.id}`,
        );
      }

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to setup planet after creation: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }

  /**
   * Planet 수정 전 검증
   */
  @BeforeUpdate()
  async beforeUpdate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;
    const planetId = req.params.id;

    // 기존 Planet 조회
    const existingPlanet = await this.planetRepository.findOne({
      where: { id: planetId },
      relations: ['creator', 'travel'],
    });

    if (!existingPlanet) {
      throw new NotFoundException('Planet을 찾을 수 없습니다.');
    }

    // 권한 확인: 생성자만 수정 가능
    if (existingPlanet.createdBy !== user.id) {
      throw new ForbiddenException('Planet 수정 권한이 없습니다.');
    }

    // Travel이 만료된 경우 수정 불가
    if (existingPlanet.travel && existingPlanet.travel.isExpired()) {
      throw new ForbiddenException(
        '만료된 Travel의 Planet은 수정할 수 없습니다.',
      );
    }

    // 수정 불가능한 필드들
    delete body.type; // 타입 변경 불가
    delete body.travelId; // Travel 연결 변경 불가
    delete body.createdBy; // 생성자 변경 불가
    delete body.messageCount; // 메시지 수는 시스템 관리
    delete body.memberCount; // 멤버 수는 시스템 관리

    this.logger.log(`Updating planet: id=${planetId}, updatedBy=${user.id}`);

    return body;
  }

  /**
   * Planet 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: Planet): Promise<Planet> {
    this.logger.log(`Planet updated: id=${entity.id}`);
    return entity;
  }

  /**
   * GROUP Planet 생성 검증
   */
  private async validateGroupPlanetCreation(
    body: any,
    user: User,
  ): Promise<void> {
    // travelId 필수
    if (!body.travelId) {
      throw new ForbiddenException('단체 Planet은 Travel ID가 필요합니다.');
    }

    // Travel 존재 확인
    const travel = await this.travelRepository.findOne({
      where: { id: body.travelId },
    });

    if (!travel) {
      throw new NotFoundException('존재하지 않는 Travel입니다.');
    }

    if (!travel.isActive) {
      throw new ForbiddenException('비활성화된 Travel입니다.');
    }

    if (travel.isExpired()) {
      throw new ForbiddenException('만료된 Travel입니다.');
    }

    // 사용자가 해당 Travel의 멤버인지 확인
    const travelUser = await this.travelUserRepository.findOne({
      where: {
        userId: user.id,
        travelId: body.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!travelUser) {
      throw new ForbiddenException(
        '이 Travel의 멤버만 Planet을 생성할 수 있습니다.',
      );
    }

    // Travel의 최대 Planet 수 확인
    const currentPlanetCount = await this.planetRepository.count({
      where: { travelId: body.travelId, isActive: true },
    });

    if (currentPlanetCount >= travel.maxPlanets) {
      throw new ForbiddenException(
        `Travel당 최대 ${travel.maxPlanets}개의 Planet만 생성 가능합니다.`,
      );
    }
  }

  /**
   * DIRECT Planet 생성 검증
   */
  private async validateDirectPlanetCreation(
    body: any,
    user: User,
  ): Promise<void> {
    // DIRECT Planet은 travelId가 없어야 함
    if (body.travelId) {
      throw new ForbiddenException('1:1 Planet은 Travel과 독립적입니다.');
    }

    // 동일 사용자가 생성할 수 있는 DIRECT Planet 수 제한 (예: 50개)
    const userDirectPlanetCount = await this.planetRepository.count({
      where: {
        createdBy: user.id,
        type: PlanetType.DIRECT,
        isActive: true,
      },
    });

    const maxDirectPlanets = 50; // 제한 수
    if (userDirectPlanetCount >= maxDirectPlanets) {
      throw new ForbiddenException(
        `사용자당 최대 ${maxDirectPlanets}개의 1:1 Planet만 생성 가능합니다.`,
      );
    }
  }
}
