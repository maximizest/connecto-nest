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
import { User } from '../../../user/user.entity';
import {
  PlanetUser,
  PlanetUserRole,
  PlanetUserStatus,
} from '../../planet-user.entity';
import { PlanetUserService } from '../../planet-user.service';

/**
 * PlanetUser API Controller (v1)
 *
 * 1:1 Planet 초대 및 멤버십 관리 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - 1:1 Planet 생성 및 사용자 초대
 * - 초대 수락/거절 처리
 * - Planet 멤버십 조회 및 관리
 * - 직접 Planet 접근 권한 관리
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 생성: 다른 사용자를 1:1 Planet에 초대
 * - 수정: 본인의 초대 수락/거절 또는 생성자 권한
 * - 조회: 본인의 멤버십만 조회 가능
 */
@Controller({ path: 'planet-users', version: '1' })
@Crud({
  entity: PlanetUser,

  // 허용할 CRUD 액션
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['planetId', 'userId', 'status', 'role', 'joinedAt'],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'targetUserId', // 초대할 사용자 ID
    'planetName', // Planet 이름 (선택사항)
    'status', // 상태 변경 (수락/거절)
  ],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'user',
    'planet',
    'invitedBy', // 초대한 사용자
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 본인의 멤버십만 조회
    index: {
      allowedFilters: ['planetId', 'status', 'role', 'joinedAt'],
      allowedIncludes: ['user', 'planet', 'invitedBy'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['user', 'planet', 'invitedBy'],
    },

    // 생성: 1:1 Planet 초대
    create: {
      allowedParams: [
        'targetUserId', // 초대할 사용자 필수
        'planetName', // Planet 이름 (선택)
      ],
    },

    // 수정: 초대 수락/거절
    update: {
      allowedParams: [
        'status', // 상태 변경 (수락/거절)
      ],
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 1:1 Planet 초대 전 검증 및 Planet 생성
   */
  @BeforeCreate()
  async beforeCreate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;

    // 대상 사용자 확인
    if (!body.targetUserId) {
      throw new ForbiddenException('초대할 사용자 ID가 필요합니다.');
    }

    if (body.targetUserId === user.id) {
      throw new ForbiddenException('자신을 초대할 수 없습니다.');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: body.targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    if (!targetUser.isActive) {
      throw new ForbiddenException('비활성화된 사용자입니다.');
    }

    // 기존 1:1 Planet 존재 확인
    const existingPlanet = await this.findExistingDirectPlanet(
      user.id,
      body.targetUserId,
    );
    if (existingPlanet) {
      throw new ForbiddenException('이미 1:1 Planet이 존재합니다.');
    }

    // 최대 직접 Planet 수 확인 (사용자당 50개 제한)
    const directPlanetCount = await this.planetUserRepository.count({
      where: {
        userId: user.id,
        status: PlanetUserStatus.ACTIVE,
        planet: { type: PlanetType.DIRECT },
      },
      relations: ['planet'],
    });

    if (directPlanetCount >= 50) {
      throw new ForbiddenException('최대 1:1 Planet 수(50개)에 도달했습니다.');
    }

    // 1:1 Planet 생성
    const planetName =
      body.planetName || `${user.name}님과 ${targetUser.name}님의 채팅`;
    const newPlanet = await this.planetRepository.save({
      name: planetName,
      type: PlanetType.DIRECT,
      createdBy: user.id,
      isActive: true, // 초대 즉시 활성화
      memberCount: 2, // 두 명의 멤버
      settings: {
        allowFileUpload: true,
        allowedFileTypes: ['image', 'video', 'audio', 'document'],
        maxFileSize: 500 * 1024 * 1024, // 500MB
        readReceiptsEnabled: true,
        typingIndicatorsEnabled: true,
        notificationsEnabled: true,
      },
    });

    const savedPlanet = newPlanet;

    // 생성자(초대하는 사용자) PlanetUser 생성
    const creatorPlanetUser = this.planetUserRepository.create({
      planetId: savedPlanet.id,
      userId: user.id,
      role: PlanetUserRole.CREATOR,
      status: PlanetUserStatus.ACTIVE,
      joinedAt: new Date(),
      invitedBy: user.id,
    });

    await this.planetUserRepository.save(creatorPlanetUser);

    // 초대받는 사용자 PlanetUser 설정 (현재 생성 중인 엔티티)
    body.planetId = savedPlanet.id;
    body.userId = body.targetUserId;
    body.role = PlanetUserRole.PARTICIPANT;
    body.status = PlanetUserStatus.INVITED; // 초대 대기 상태
    body.joinedAt = new Date();
    body.invitedBy = user.id;

    // 불필요한 필드 제거
    delete body.targetUserId;
    delete body.planetName;

    this.logger.log(
      `Direct planet invitation created: planetId=${savedPlanet.id}, inviter=${user.id}, target=${body.userId}`,
    );

    return body;
  }

  /**
   * 1:1 Planet 초대 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: PlanetUser): Promise<PlanetUser> {
    try {
      this.logger.log(
        `Direct planet invitation sent: id=${entity.id}, planetId=${entity.planetId}, userId=${entity.userId}`,
      );

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to process after direct planet creation: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }

  /**
   * 초대 수락/거절 전 검증
   */
  @BeforeUpdate()
  async beforeUpdate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;
    const planetUserId = req.params.id;

    // 기존 PlanetUser 조회
    const existingPlanetUser = await this.planetUserRepository.findOne({
      where: { id: planetUserId },
      relations: ['user', 'planet', 'invitedBy'],
    });

    if (!existingPlanetUser) {
      throw new NotFoundException('Planet 멤버십을 찾을 수 없습니다.');
    }

    // 권한 확인: 본인의 멤버십이거나 생성자여야 함
    const canModify =
      existingPlanetUser.userId === user.id || // 본인의 멤버십
      existingPlanetUser.planet.createdBy === user.id; // Planet 생성자

    if (!canModify) {
      throw new ForbiddenException('멤버십 관리 권한이 없습니다.');
    }

    // 상태 변경 처리
    if (body.status) {
      if (existingPlanetUser.userId !== user.id) {
        throw new ForbiddenException('본인의 초대만 수락/거절할 수 있습니다.');
      }

      if (existingPlanetUser.status !== PlanetUserStatus.INVITED) {
        throw new ForbiddenException(
          '대기 중인 초대만 수락/거절할 수 있습니다.',
        );
      }

      // 수락/거절 상태 검증
      if (body.status === PlanetUserStatus.ACTIVE) {
        body.joinedAt = new Date();
        this.logger.log(
          `Direct planet invitation accepted: planetId=${existingPlanetUser.planetId}, userId=${user.id}`,
        );
      } else if (body.status === PlanetUserStatus.LEFT) {
        body.leftAt = new Date();
        this.logger.log(
          `Direct planet invitation declined: planetId=${existingPlanetUser.planetId}, userId=${user.id}`,
        );
      } else {
        throw new ForbiddenException('올바르지 않은 상태입니다.');
      }
    }

    // 수정 불가능한 필드들
    delete body.userId;
    delete body.planetId;
    delete body.role;
    delete body.invitedBy;

    return body;
  }

  /**
   * 초대 수락/거절 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: PlanetUser): Promise<PlanetUser> {
    try {
      // 거절 시 Planet 및 관련 데이터 정리
      if (entity.status === PlanetUserStatus.LEFT) {
        await this.handleInvitationDecline(entity);
      }

      this.logger.log(`Planet user updated: id=${entity.id}`);
      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to process after planet user update: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }

  /**
   * 기존 1:1 Planet 존재 확인
   */
  private async findExistingDirectPlanet(
    userId1: number,
    userId2: number,
  ): Promise<Planet | null> {
    const existingPlanet = await this.planetRepository
      .createQueryBuilder('planet')
      .innerJoin('planet.directMembers', 'pu1', 'pu1.user_id = :userId1', {
        userId1,
      })
      .innerJoin('planet.directMembers', 'pu2', 'pu2.user_id = :userId2', {
        userId2,
      })
      .where('planet.type = :type', { type: PlanetType.DIRECT })
      .andWhere('planet.is_active = :isActive', { isActive: true })
      .getOne();

    return existingPlanet;
  }

  /**
   * 초대 거절 시 Planet 정리
   */
  private async handleInvitationDecline(
    declinedPlanetUser: PlanetUser,
  ): Promise<void> {
    try {
      // Planet과 모든 관련 PlanetUser 삭제 (소프트 삭제)
      await this.planetRepository.update(declinedPlanetUser.planetId, {
        isActive: false,
      });

      // 생성자의 PlanetUser도 비활성화
      await this.planetUserRepository
        .createQueryBuilder()
        .update(PlanetUser)
        .set({
          status: PlanetUserStatus.LEFT,
          leftAt: new Date(),
        })
        .where('planet_id = :planetId', {
          planetId: declinedPlanetUser.planetId,
        })
        .andWhere('status = :status', { status: PlanetUserStatus.ACTIVE })
        .execute();

      this.logger.log(
        `Direct planet cleaned up after decline: planetId=${declinedPlanetUser.planetId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to clean up declined planet: ${error.message}`,
        error.stack,
      );
    }
  }
}
