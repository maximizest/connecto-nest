import { AfterUpdate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
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
    'phone',
    'language',
    'timezone',
    'notificationsEnabled',
    'advertisingConsentEnabled',
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
        'phone',
        'language',
        'timezone',
        'notificationsEnabled',
        'advertisingConsentEnabled',
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

    if (entity.isBanned) {
      throw new ForbiddenException('차단된 계정입니다.');
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
}
