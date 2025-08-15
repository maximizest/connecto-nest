import {
  AfterDestroy,
  AfterRecover,
  AfterUpdate,
  BeforeDestroy,
  BeforeShow,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getCurrentUserFromContext } from '../../../../common/helpers/current-user.helper';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';

/**
 * User API Controller (v1)
 *
 * 사용자 관리 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - 본인 프로필 조회 및 수정
 * - Travel 멤버십 목록 조회
 * - Planet 멤버십 목록 조회
 * - 사용자 설정 관리
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 본인의 정보만 조회/수정/삭제 가능
 * - 사용자 목록 조회 불가 (index route 제거됨)
 */
@Controller({ path: 'users', version: '1' })
@Crud({
  entity: User,

  // 허용할 CRUD 액션 (index 제거)
  only: ['show', 'update', 'destroy'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['name', 'provider', 'createdAt'],

  // Body에서 허용할 파라미터 (수정 시)
  allowedParams: [
    'name',
    'phone',
    'language',
    'timezone',
    'notificationsEnabled',
    'advertisingConsentEnabled',
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
    // 단일 조회: 본인의 정보만 조회 가능
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
        'phone',
        'language',
        'timezone',
        'notificationsEnabled',
        'advertisingConsentEnabled',
      ],
    },

    // 삭제: Soft Delete 활성화
    destroy: {
      softDelete: true, // ✅ User는 Soft Delete 사용
    },
  },
})
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    public readonly crudService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자 정보 조회 전 권한 검증 - 본인만 조회 가능
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    // 헬퍼 함수를 사용하여 현재 사용자 정보 추출
    const user = getCurrentUserFromContext(context);
    const targetUserId = parseInt(params.id, 10);

    // 본인의 정보만 조회 가능
    if (user.id !== targetUserId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }

    return params;
  }

  /**
   * 사용자 정보 수정 전 권한 검증
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

    if (entity.isBanned) {
      throw new ForbiddenException('차단된 계정입니다.');
    }

    this.logger.log(`User profile updating: userId=${user.id}`);

    return entity;
  }

  /**
   * 사용자 정보 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: User): Promise<User> {
    try {
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
   * 사용자 삭제 전 처리 (Soft Delete)
   */
  @BeforeDestroy()
  async beforeDestroy(entity: User, context: any): Promise<User> {
    const user = getCurrentUserFromContext(context);

    // 본인의 계정만 삭제 가능
    if (user.id !== entity.id) {
      throw new ForbiddenException('본인의 계정만 삭제할 수 있습니다.');
    }

    // 삭제 메타데이터 설정
    entity.deletedBy = user.id;
    entity.deletionReason =
      context.request?.body?.reason || 'User requested account deletion';

    this.logger.log(`User soft-delete initiated: userId=${entity.id}`);

    return entity;
  }

  /**
   * 사용자 삭제 후 처리
   */
  @AfterDestroy()
  async afterDestroy(entity: User, context: any): Promise<User> {
    this.logger.log(
      `User soft-deleted: userId=${entity.id}, deletedBy=${entity.deletedBy}`,
    );

    // TODO: 필요시 추가 정리 작업
    // - 활성 세션 종료
    // - 캐시 정리
    // - 알림 발송 등

    return entity;
  }

  /**
   * 사용자 복구 후 처리 (Soft Delete 복구)
   */
  @AfterRecover()
  async afterRecover(entity: User, context: any): Promise<User> {
    // 복구 시 메타데이터 정리
    entity.deletedBy = undefined;
    entity.deletionReason = undefined;

    this.logger.log(`User recovered: userId=${entity.id}`);

    return entity;
  }
}
