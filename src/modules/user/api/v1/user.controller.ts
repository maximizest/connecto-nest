import {
  AfterUpdate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
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
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 제한적 정보만 공개
    index: {
      allowedFilters: ['name', 'isOnline', 'provider', 'status'],
      allowedIncludes: ['profile'], // 프로필 정보 포함 허용
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

    // Virtual User entity with deletion impact information
    const deletionImpactUser = Object.assign(new User(), {
      ...user,
      status: 'DELETION_ANALYSIS',
    });

    return crudResponse(deletionImpactUser);
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

        // Create a virtual User entity with deletion status
        const deletedUser = Object.assign(new User(), {
          ...user,
          name: '[삭제된 사용자]',
          email: '[삭제됨]',
          status: 'DELETED',
          isActive: false,
          updatedAt: new Date(),
        });

        return crudResponse(deletedUser);
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

      // Create a virtual User entity with validation status
      const validationUser = Object.assign(new User(), {
        ...user,
        status: validation.compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
        updatedAt: new Date(),
      });

      return crudResponse(validationUser);
    } catch (error) {
      this.logger.error(
        `❌ Failed to validate deletion for user ${userId}:`,
        error.stack,
      );
      throw new NotFoundException('삭제 검증 중 오류가 발생했습니다.');
    }
  }
}
