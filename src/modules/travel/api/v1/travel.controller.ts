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
import { Planet, PlanetType } from '../../../planet/planet.entity';
import {
  TravelUser,
  TravelUserRole,
  TravelUserStatus,
} from '../../../travel-user/travel-user.entity';
import { User } from '../../../user/user.entity';
import { TravelAccessGuard } from '../../guards/travel-access.guard';
import { Travel, TravelStatus, TravelVisibility } from '../../travel.entity';
import { TravelService } from '../../travel.service';

/**
 * Travel API Controller (v1)
 *
 * Travel(여행) CRUD 작업을 수행합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Travel 생성 (초대 코드 자동 생성, 기본 Planet 생성)
 * - Travel 수정 (설정 변경, 만기 관리)
 * - Travel 조회 (멤버/Planet 목록 포함)
 * - Travel 만기 관리
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - Travel 수정/삭제는 생성자만 가능
 * - 만료된 Travel은 수정 불가
 */
@Controller({ path: 'travels', version: '1' })
@Crud({
  entity: Travel,

  // 허용할 CRUD 액션
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: [
    'createdBy',
    'status',
    'name',
    'visibility',
    'expiryDate',
    'createdAt',
  ],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'name',
    'description',
    'expiryDate',
    'visibility',
    'settings',
    'coverImage',
    'status', // 관리자용
  ],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'creator',
    'members',
    'members.user', // TravelUser -> User
    'planets',
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 사용자가 속한 Travel만 조회
    index: {
      allowedFilters: [
        'name',
        'status',
        'visibility',
        'expiryDate',
        'createdAt',
      ],
      allowedIncludes: ['creator', 'members'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['creator', 'members', 'members.user', 'planets'],
    },

    // 생성: 기본 필드만 허용
    create: {
      allowedParams: [
        'name',
        'description',
        'expiryDate',
        'visibility',
        'settings',
        'coverImage',
      ],
    },

    // 수정: 생성자만 허용
    update: {
      allowedParams: [
        'name',
        'description',
        'expiryDate',
        'visibility',
        'settings',
        'coverImage',
        'status', // 관리자 또는 생성자가 비활성화할 수 있음
      ],
    },
  },
})
@UseGuards(AuthGuard, TravelAccessGuard)
export class TravelController {
  private readonly logger = new Logger(TravelController.name);

  constructor(
    public readonly crudService: TravelService,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
  ) {}

  /**
   * Travel 생성 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;

    // 기본값 설정
    body.createdBy = user.id;
    body.status = TravelStatus.ACTIVE;
    body.inviteCode = this.generateInviteCode();
    body.memberCount = 1; // 생성자 포함
    body.planetCount = 0; // 초기에는 0 (Planet은 별도 생성)

    // 만료일 검증 (최소 1일 후, 최대 1년 후)
    if (body.expiryDate) {
      const expiryDate = new Date(body.expiryDate);
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneYear = 365 * oneDay;

      if (expiryDate.getTime() <= now.getTime() + oneDay) {
        throw new ForbiddenException('만료일은 최소 1일 후로 설정해야 합니다.');
      }

      if (expiryDate.getTime() > now.getTime() + oneYear) {
        throw new ForbiddenException(
          '만료일은 최대 1년 후까지 설정 가능합니다.',
        );
      }
    } else {
      // 기본 만료일: 30일 후
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      body.expiryDate = defaultExpiry;
    }

    // 설정 기본값
    if (!body.settings) {
      body.settings = {
        allowInviteByMembers: true,
        maxMembers: 50,
        autoDeleteExpiredMessages: false,
        requireApprovalForJoin: false,
      };
    }

    // 기본값 설정 (기본은 초대 전용)
    if (body.visibility === undefined) {
      body.visibility = TravelVisibility.INVITE_ONLY;
    }

    this.logger.log(
      `Creating travel: name=${body.name}, createdBy=${body.createdBy}, expiryDate=${body.expiryDate}`,
    );

    return body;
  }

  /**
   * Travel 생성 후 처리 (생성자를 멤버로 추가, 기본 Planet 생성)
   */
  @AfterCreate()
  async afterCreate(entity: Travel, @Request() req: any): Promise<Travel> {
    const user: User = req.user;

    try {
      // 1. 생성자를 Travel 멤버로 추가
      const travelUser = this.travelUserRepository.create({
        travelId: entity.id,
        userId: user.id,
        status: TravelUserStatus.ACTIVE,
        role: TravelUserRole.OWNER,
        joinedAt: new Date(),
        invitedBy: user.id,
      });

      await this.travelUserRepository.save(travelUser);

      // 2. 기본 그룹 Planet 생성 ("일반 채팅")
      const defaultPlanet = this.planetRepository.create({
        name: '일반 채팅',
        description: `${entity.name}의 메인 채팅방입니다.`,
        type: PlanetType.GROUP,
        travelId: entity.id,
        createdBy: user.id,
        isActive: true,
        messageCount: 0,
        memberCount: 1,
        settings: {
          allowFileUpload: true,
          maxFileSize: 500 * 1024 * 1024, // 500MB
          allowedFileTypes: ['image', 'video', 'file'],
          messageRetentionDays: 365,
        },
      });

      const savedPlanet = await this.planetRepository.save(defaultPlanet);

      // 3. Travel의 planetCount 업데이트
      await this.travelRepository.update(entity.id, {
        planetCount: 1,
      });

      this.logger.log(
        `Travel created successfully: id=${entity.id}, defaultPlanet=${savedPlanet.id}`,
      );

      // Travel 엔티티 업데이트 후 반환
      entity.memberCount = 1;
      entity.planetCount = 1;

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to setup travel after creation: ${error.message}`,
        error.stack,
      );

      // Travel 생성은 성공했지만 후속 작업 실패 시에도 Travel 객체는 반환
      // 클라이언트가 재시도하거나 수동으로 설정할 수 있도록 함
      return entity;
    }
  }

  /**
   * Travel 수정 전 검증
   */
  @BeforeUpdate()
  async beforeUpdate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;
    const travelId = req.params.id;

    // 기존 Travel 조회
    const existingTravel = await this.travelRepository.findOne({
      where: { id: travelId },
      relations: ['creator'],
    });

    if (!existingTravel) {
      throw new NotFoundException('Travel을 찾을 수 없습니다.');
    }

    // 권한 확인: 생성자만 수정 가능
    if (existingTravel.createdBy !== user.id) {
      throw new ForbiddenException('Travel 수정 권한이 없습니다.');
    }

    // 만료된 Travel은 수정 불가 (상태 변경 제외)
    if (existingTravel.isExpired() && !body.status) {
      throw new ForbiddenException('만료된 Travel은 수정할 수 없습니다.');
    }

    // 만료일 수정 시 검증
    if (body.expiryDate && body.expiryDate !== existingTravel.expiryDate) {
      const newExpiryDate = new Date(body.expiryDate);
      const now = new Date();

      // 과거 날짜 불가
      if (newExpiryDate.getTime() <= now.getTime()) {
        throw new ForbiddenException(
          '만료일은 현재 시간 이후로 설정해야 합니다.',
        );
      }

      // 최대 1년 후까지
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (newExpiryDate.getTime() > now.getTime() + oneYear) {
        throw new ForbiddenException(
          '만료일은 최대 1년 후까지 설정 가능합니다.',
        );
      }
    }

    // 멤버 수, Planet 수는 직접 수정 불가 (시스템에서 관리)
    delete body.memberCount;
    delete body.planetCount;
    delete body.inviteCode; // 초대 코드는 별도 API로 재생성
    delete body.createdBy; // 생성자 변경 불가

    this.logger.log(`Updating travel: id=${travelId}, updatedBy=${user.id}`);

    return body;
  }

  /**
   * Travel 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: Travel): Promise<Travel> {
    // 상태가 CANCELLED로 변경된 경우 모든 Planet 비활성화
    if (entity.status === TravelStatus.CANCELLED) {
      await this.planetRepository.update(
        { travelId: entity.id },
        { isActive: false },
      );

      this.logger.log(
        `Travel deactivated: id=${entity.id}, planets deactivated`,
      );
    }

    // 만료일이 변경된 경우 캐시 무효화 등 추가 처리 가능
    this.logger.log(`Travel updated: id=${entity.id}`);

    return entity;
  }

  /**
   * 초대 코드 생성 (8자리 대문자 + 숫자)
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * 사용자가 속한 Travel 필터링 (index 액션용)
   *
   * 참고: 실제로는 nestjs-crud의 interceptor나 middleware에서 처리하는 것이 좋지만,
   * 여기서는 간단한 구현을 위해 beforeIndex hook을 사용할 수도 있습니다.
   * 하지만 nestjs-crud의 제약으로 인해 클라이언트에서 필터링을 요청해야 할 수 있습니다.
   */
}
