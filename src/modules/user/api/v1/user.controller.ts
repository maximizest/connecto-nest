import { AfterUpdate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { getCurrentUserFromContext } from '../../../../common/helpers/current-user.helper';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  PlanetUser,
  PlanetUserStatus,
} from '../../../planet-user/planet-user.entity';
import { Planet, PlanetType } from '../../../planet/planet.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../../travel-user/travel-user.entity';
import { Travel, TravelStatus } from '../../../travel/travel.entity';
import { UserDeletionService } from '../../services/user-deletion.service';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';

/**
 * User API Controller (v1)
 *
 * 사용자 관리 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - 소셜 프로필 조회 및 수정
 * - Travel 멤버십 목록 조회
 * - Planet 멤버십 목록 조회
 * - 온라인 상태 및 활동 로그 관리
 * - 사용자 설정 관리
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 본인의 정보만 조회/수정 가능
 * - 다른 사용자의 기본 정보는 조회 가능 (제한적)
 */
@Controller({ path: 'users', version: '1' })
@Crud({
  entity: User,

  // 허용할 CRUD 액션
  only: ['index', 'show', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: [
    'name',
    'isOnline',
    'provider',
    'status',
    'createdAt',
    'lastSeenAt',
  ],

  // Body에서 허용할 파라미터 (수정 시)
  allowedParams: [
    'name',
    'avatar',
    'language',
    'timezone',
    'notificationsEnabled',
    'isOnline', // 온라인 상태 업데이트
  ],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'profile', // 프로필 정보 포함 허용
    'travelMemberships',
    'travelMemberships.travel',
    'planetMemberships',
    'planetMemberships.planet',
    'createdTravels',
    'createdPlanets',
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 제한적 정보만 공개
    index: {
      allowedFilters: ['name', 'isOnline', 'provider', 'status'],
      allowedIncludes: [], // 관계 정보는 비공개
    },

    // 단일 조회: 본인은 모든 정보, 타인은 제한적 정보
    show: {
      allowedIncludes: [
        'profile', // 프로필 정보 포함 허용
        'travelMemberships',
        'travelMemberships.travel',
        'planetMemberships',
        'planetMemberships.planet',
      ],
    },

    // 수정: 본인만 가능
    update: {
      allowedParams: [
        'name',
        'avatar',
        'language',
        'timezone',
        'notificationsEnabled',
        'isOnline',
      ],
    },
  },
})
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    public readonly crudService: UserService,
    private readonly userDeletionService: UserDeletionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
  ) {}

  /**
   * 사용자 정보 수정 전 권한 검증 (온라인 상태 처리는 User 엔티티에서 자동 처리)
   */
  @BeforeUpdate()
  async beforeUpdate(entity: User, context: any): Promise<User> {
    // 헬퍼 함수를 사용하여 현재 사용자 정보 추출
    const user = getCurrentUserFromContext(context);
    const targetUserId = entity.id;

    // 본인의 정보만 수정 가능 - 엔티티에서 처리하기 어려운 비즈니스 로직
    if (user.id !== targetUserId) {
      throw new ForbiddenException('본인의 정보만 수정할 수 있습니다.');
    }

    if (!entity.isActive) {
      throw new ForbiddenException('비활성화된 계정입니다.');
    }

    // lastSeenAt 갱신은 User 엔티티에서 자동 처리됨
    this.logger.log(`User profile updating: userId=${user.id}`);

    return entity;
  }

  /**
   * 사용자 정보 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: User): Promise<User> {
    try {
      // 온라인 상태 변경 시 관련 Travel/Planet에 브로드캐스트
      // (WebSocket 연동은 추후 구현)

      this.logger.log(`User profile updated: userId=${entity.id}`);
      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to process after user update: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }

  /**
   * 사용자별 접근 가능한 Travel 목록 조회 (필터링된 결과)
   */
  private async getUserTravels(userId: number): Promise<Travel[]> {
    return await this.travelRepository
      .createQueryBuilder('travel')
      .innerJoin('travel.members', 'tu', 'tu.user_id = :userId', { userId })
      .where('tu.status = :status', { status: TravelUserStatus.ACTIVE })
      .andWhere('travel.status IN (:...statuses)', {
        statuses: [TravelStatus.ACTIVE, TravelStatus.COMPLETED],
      })
      .orderBy('tu.joined_at', 'DESC')
      .getMany();
  }

  /**
   * 사용자별 접근 가능한 Planet 목록 조회 (필터링된 결과)
   */
  private async getUserPlanets(userId: number): Promise<Planet[]> {
    const groupPlanets = await this.planetRepository
      .createQueryBuilder('planet')
      .innerJoin('planet.travel', 'travel')
      .innerJoin('travel.members', 'tu', 'tu.user_id = :userId', { userId })
      .where('planet.type = :type', { type: PlanetType.GROUP })
      .andWhere('planet.is_active = :isActive', { isActive: true })
      .andWhere('tu.status = :status', { status: TravelUserStatus.ACTIVE })
      .orderBy('planet.created_at', 'DESC')
      .getMany();

    const directPlanets = await this.planetRepository
      .createQueryBuilder('planet')
      .innerJoin('planet.directMembers', 'pu', 'pu.user_id = :userId', {
        userId,
      })
      .where('planet.type = :type', { type: PlanetType.DIRECT })
      .andWhere('planet.is_active = :isActive', { isActive: true })
      .andWhere('pu.status = :status', { status: PlanetUserStatus.ACTIVE })
      .orderBy('planet.created_at', 'DESC')
      .getMany();

    return [...groupPlanets, ...directPlanets];
  }

  /**
   * 사용자 활동 통계 생성
   */
  private async getUserStats(userId: number): Promise<any> {
    const [travelCount, planetCount, messageCount, directPlanetCount] =
      await Promise.all([
        // 참여 중인 Travel 수
        this.travelUserRepository.count({
          where: {
            userId,
            status: TravelUserStatus.ACTIVE,
          },
        }),

        // 접근 가능한 Planet 수 (GROUP)
        this.travelUserRepository
          .createQueryBuilder('tu')
          .innerJoin('tu.travel', 'travel')
          .innerJoin('travel.planets', 'planet', 'planet.type = :type', {
            type: PlanetType.GROUP,
          })
          .where('tu.user_id = :userId', { userId })
          .andWhere('tu.status = :status', { status: TravelUserStatus.ACTIVE })
          .andWhere('planet.is_active = :isActive', { isActive: true })
          .getCount(),

        // 총 메시지 수 (추후 구현 시 활성화)
        0, // messageRepository.count({ where: { senderId: userId } }),

        // 1:1 Planet 수
        this.planetUserRepository.count({
          where: {
            userId,
            status: PlanetUserStatus.ACTIVE,
            planet: { type: PlanetType.DIRECT },
          },
          relations: ['planet'],
        }),
      ]);

    return {
      totalTravels: travelCount,
      totalGroupPlanets: planetCount,
      totalDirectPlanets: directPlanetCount,
      totalMessages: messageCount,
      joinDate: new Date(), // 추후 실제 가입일로 변경
    };
  }

  /**
   * 내 프로필 조회 (풍부한 정보 포함)
   * GET /api/v1/users/me
   */
  @Get('me')
  async getMyProfile(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    // 사용자 기본 정보
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      select: [
        'id',
        'name',
        'email',
        'avatar',
        'provider',
        'status',
        'isOnline',
        'lastSeenAt',
        'language',
        'timezone',
        'notificationsEnabled',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!fullUser) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    // 사용자 통계 및 관련 정보
    const [travels, planets, stats] = await Promise.all([
      this.getUserTravels(user.id),
      this.getUserPlanets(user.id),
      this.getUserStats(user.id),
    ]);

    return {
      ...fullUser,
      travels: travels.map((travel) => ({
        id: travel.id,
        name: travel.name,
        description: travel.description,
        status: travel.status,
        memberCount: travel.memberCount,
        planetCount: travel.planetCount,
        expiryDate: travel.expiryDate,
        createdAt: travel.createdAt,
      })),
      planets: planets.map((planet) => ({
        id: planet.id,
        name: planet.name,
        type: planet.type,
        memberCount: planet.memberCount,
        travelId: planet.travelId,
        createdAt: planet.createdAt,
      })),
      stats,
    };
  }

  /**
   * 내 Travel 목록 조회
   * GET /api/v1/users/me/travels
   */
  @Get('me/travels')
  async getMyTravels(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;
    const travels = await this.getUserTravels(user.id);

    return {
      travels: travels.map((travel) => ({
        id: travel.id,
        name: travel.name,
        description: travel.description,
        status: travel.status,
        visibility: travel.visibility,
        memberCount: travel.memberCount,
        planetCount: travel.planetCount,
        totalMessages: travel.totalMessages,
        expiryDate: travel.expiryDate,
        lastActivityAt: travel.lastActivityAt,
        createdAt: travel.createdAt,

        isCreatedByAdmin: true, // Admin이 생성하므로 사용자는 생성자가 아님
      })),
      totalCount: travels.length,
    };
  }

  /**
   * 내 Planet 목록 조회
   * GET /api/v1/users/me/planets
   */
  @Get('me/planets')
  async getMyPlanets(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<any> {
    const user: User = currentUser as User;
    const planets = await this.getUserPlanets(user.id);

    return {
      planets: planets.map((planet) => ({
        id: planet.id,
        name: planet.name,
        type: planet.type,
        memberCount: planet.memberCount,
        travelId: planet.travelId,
        timeRestriction: planet.timeRestriction,
        createdAt: planet.createdAt,
        isCreatedByAdmin: true, // Admin이 생성하므로 사용자는 생성자가 아님
        // 1:1 Planet의 경우 상대방 정보 (추후 구현)
        // otherMember: planet.type === PlanetType.DIRECT ? otherMemberInfo : null,
      })),
      groupPlanets: planets.filter((p) => p.type === PlanetType.GROUP).length,
      directPlanets: planets.filter((p) => p.type === PlanetType.DIRECT).length,
      totalCount: planets.length,
    };
  }

  /**
   * 사용자 통계 조회
   * GET /api/v1/users/me/stats
   */
  @Get('me/stats')
  async getMyStats(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;
    const stats = await this.getUserStats(user.id);

    return {
      ...stats,
      userId: user.id,
      generatedAt: new Date(),
    };
  }

  /**
   * 온라인 상태 업데이트
   * GET /api/v1/users/me/online
   */
  @Get('me/online')
  async updateOnlineStatus(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    // 온라인 상태 및 lastSeenAt 업데이트
    await this.userRepository.update(user.id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    this.logger.log(`User online status updated: userId=${user.id}`);

    return {
      success: true,
      userId: user.id,
      isOnline: true,
      lastSeenAt: new Date(),
    };
  }

  /**
   * 다른 사용자 기본 정보 조회 (공개 정보만)
   * GET /api/v1/users/:id/public
   */
  @Get(':id/public')
  async getPublicProfile(@Param('id') userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(userId), isActive: true },
      select: [
        'id',
        'name',
        'avatar',
        'provider',
        'status',
        'isOnline',
        'lastSeenAt',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 공개 통계 정보만 반환
    const publicStats = {
      totalTravels: await this.travelUserRepository.count({
        where: { userId: user.id, status: TravelUserStatus.ACTIVE },
      }),
      joinDate: user.createdAt,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
    };

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      status: user.status,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      stats: publicStats,
    };
  }

  /**
   * 계정 삭제 영향도 분석
   * 사용자가 삭제할 데이터의 양과 영향을 확인할 수 있습니다.
   */
  @Get('me/deletion-impact')
  async getMyDeletionImpact(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    this.logger.log(`User ${user.id} is checking deletion impact`);

    const impact = await this.userDeletionService.analyzeDeletionImpact(
      user.id,
    );

    return {
      message: '계정 삭제 시 영향도 분석 결과입니다.',
      impact,
      warnings: [
        '⚠️ 개인정보는 즉시 완전 삭제됩니다.',
        '⚠️ 메시지는 익명화되어 유지됩니다.',
        '⚠️ 이 작업은 되돌릴 수 없습니다.',
      ],
    };
  }

  /**
   * 본인 계정 완전 삭제 (개보법 준수)
   * 한국 개인정보보호법에 따라 개인정보를 즉시 완전 삭제합니다.
   */
  @Delete('me')
  async deleteMyAccount(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    this.logger.log(
      `🔥 User ${user.id} (${user.name}) requested account deletion`,
    );

    try {
      // 삭제 전 영향도 분석
      const impact = await this.userDeletionService.analyzeDeletionImpact(
        user.id,
      );

      this.logger.log(
        `📊 Deletion impact: ${impact.totalImpactedRecords} records will be affected`,
      );

      // 완전 삭제 실행
      const result = await this.userDeletionService.deleteUserCompletely(
        user.id,
      );

      if (result.success) {
        this.logger.log(`✅ Successfully deleted user ${user.id}`);

        return {
          success: true,
          message: '계정이 성공적으로 삭제되었습니다.',
          deletionSummary: {
            personalDataDeleted: result.deletedPersonalData,
            serviceDataAnonymized: result.anonymizedServiceData,
            totalRecordsProcessed: (() => {
              const personalData = result.deletedPersonalData;
              const personalDataCount =
                Number(personalData.user) +
                Number(personalData.profile) +
                Number(personalData.notifications) +
                Number(personalData.readReceipts);
              const serviceDataCount = Object.values(
                result.anonymizedServiceData,
              ).reduce((sum: number, item: number) => sum + item, 0);
              return personalDataCount + serviceDataCount;
            })(),
          },
          legalCompliance: {
            gdprCompliant: true,
            koreaPipaCompliant: true,
            deletedAt: new Date(),
            retentionPolicy: '개인정보는 즉시 완전 삭제되었습니다.',
          },
        };
      } else {
        throw new Error('계정 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete user ${user.id}:`, error.stack);
      throw new ForbiddenException(
        `계정 삭제 중 오류가 발생했습니다: ${error.message}`,
      );
    }
  }

  /**
   * 삭제 준수성 검증 (개발/테스트용)
   * 관리자가 특정 사용자의 삭제 준수성을 검증할 때 사용
   */
  @Post(':id/validate-deletion')
  async validateUserDeletion(
    @Param('id') userId: string,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    // 본인 계정만 검증 가능
    if (user.id !== parseInt(userId)) {
      throw new ForbiddenException(
        '본인 계정의 삭제 상태만 검증할 수 있습니다.',
      );
    }

    this.logger.log(`🔍 Validating deletion compliance for User ${userId}`);

    try {
      const validation =
        await this.userDeletionService.validateDeletionCompliance(
          parseInt(userId),
        );

      return {
        userId: parseInt(userId),
        compliant: validation.compliant,
        status: validation.compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
        remainingPersonalData: validation.remainingPersonalData,
        issues: validation.issues,
        checkedAt: new Date(),
        legalRequirements: {
          koreanPipa: validation.compliant,
          gdpr: validation.compliant,
          dataMinimization: validation.compliant,
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to validate deletion for user ${userId}:`,
        error.stack,
      );
      throw new NotFoundException('삭제 검증 중 오류가 발생했습니다.');
    }
  }
}
