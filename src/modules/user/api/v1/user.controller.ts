import {
  BeforeShow,
  BeforeUpdate,
  BeforeDestroy,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';
import { CurrentUserData } from '../../../../common/decorators/current-user.decorator';

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
  only: ['show', 'update', 'destroy'],
  allowedFilters: ['name', 'email', 'phone'],
  allowedParams: [
    'name',
    'phone',
    'notificationsEnabled',
    'advertisingConsentEnabled',
  ],
  allowedIncludes: ['profile'],
  routes: {
    show: {
      allowedIncludes: ['profile'],
    },
    update: {
      allowedParams: [
        'name',
        'phone',
        'notificationsEnabled',
        'advertisingConsentEnabled',
      ],
    },
    destroy: {
      softDelete: true,
    },
  },
})
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(public readonly crudService: UserService) {}

  /**
   * 사용자 조회 전 권한 확인 - 본인만 조회 가능
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const currentUser: CurrentUserData = context.request?.user;
    const targetUserId = parseInt(params.id, 10);
    
    // 본인의 정보만 조회 가능
    if (currentUser.id !== targetUserId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }

    return params;
  }

  /**
   * 사용자 정보 수정 전 권한 확인 - 본인만 수정 가능
   */
  @BeforeUpdate()
  async beforeUpdate(entity: User, context: any): Promise<User> {
    const currentUser: CurrentUserData = context.request?.user;
    
    // 본인의 정보만 수정 가능
    if (currentUser.id !== entity.id) {
      throw new ForbiddenException('본인의 정보만 수정할 수 있습니다.');
    }

    // 차단된 계정은 수정 불가
    if (entity.isBanned) {
      throw new ForbiddenException('차단된 계정입니다.');
    }

    this.logger.log(`User profile updating: userId=${entity.id}`);
    
    return entity;
  }

  /**
   * 사용자 계정 삭제 전 권한 확인 - 본인만 삭제 가능
   */
  @BeforeDestroy()
  async beforeDestroy(entity: User, context: any): Promise<User> {
    const currentUser: CurrentUserData = context.request?.user;
    
    // 본인의 계정만 삭제 가능
    if (currentUser.id !== entity.id) {
      throw new ForbiddenException('본인의 계정만 삭제할 수 있습니다.');
    }

    // 삭제 메타데이터 설정
    entity.deletedBy = currentUser.id;
    entity.deletionReason = context.request?.body?.reason || 'User requested account deletion';
    
    this.logger.log(
      `User soft-delete initiated: userId=${entity.id}, deletedBy=${entity.deletedBy}`,
    );

    return entity;
  }
}