import {
  AfterUpdate,
  BeforeCreate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { getCurrentUserIdFromContext } from '../../../../common/helpers/current-user.helper';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../../user/user.entity';
import { Notification } from '../../notification.entity';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationPriority } from '../../enums/notification-priority.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationService } from '../../notification.service';

/**
 * Notification API Controller (v1)
 *
 * Travel/Planet 알림 시스템 관리를 위한 REST API
 *
 * 주요 기능:
 * - 사용자 알림 목록 조회
 * - 알림 읽음 처리
 * - 알림 설정 관리
 * - 알림 통계 조회
 * 
 * 푸시 토큰 관리는 별도의 PushTokenController에서 처리합니다.
 */
@Controller({ path: 'notifications', version: '1' })
@Crud({
  entity: Notification,
  allowedFilters: [
    'type',
    'priority',
    'status',
    'travelId',
    'planetId',
    'createdAt',
  ],
  allowedParams: ['status'],
  allowedIncludes: ['triggerUser', 'travel', 'planet'],
  only: ['index', 'show', 'update'],
  routes: {
    index: {
      allowedFilters: [
        'userId', // 보안을 위해 userId 필터 허용
        'type',
        'priority',
        'status',
        'travelId',
        'planetId',
        'createdAt',
      ],
      allowedIncludes: ['triggerUser', 'travel', 'planet'],
    },
    show: {
      allowedIncludes: ['triggerUser', 'travel', 'planet'],
    },
  },
})
@UseGuards(AuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    public readonly crudService: NotificationService,
  ) {}

  @BeforeCreate()
  async beforeCreate(body: any, context: any) {
    // 헬퍼 함수를 사용하여 현재 사용자 ID 추출
    const userId = getCurrentUserIdFromContext(context);

    // 생성 시 userId 자동 설정
    body.userId = userId;

    return body;
  }

  @BeforeUpdate()
  async beforeUpdate(
    entity: Notification,
    body: any,
    context: any,
  ): Promise<any> {
    const user: User = context.request?.user;

    // 권한 확인
    if (entity.userId !== user.id) {
      throw new Error('알림 수정 권한이 없습니다.');
    }

    return body;
  }

  @AfterUpdate()
  async afterUpdate(entity: Notification, context: any): Promise<void> {
    this.logger.log(
      `Notification updated: id=${entity.id}, userId=${entity.userId}`,
    );
  }

  // 내 알림 목록 조회는 @Crud index 라우트를 사용합니다.
  // GET /api/v1/notifications?filter[userId_eq]={currentUserId}&filter[type_in]=MESSAGE,TRAVEL&filter[status_eq]=DELIVERED
  // @BeforeCreate/@BeforeUpdate 훅에서 userId 필터링을 자동으로 처리합니다.

  // 알림 상세 조회는 @Crud show 라우트를 사용합니다.
  // GET /api/v1/notifications/:id?include=triggerUser,travel,planet
  // @BeforeCreate/@BeforeUpdate 훅에서 userId 권한 확인을 자동으로 처리합니다.

  // 푸시 토큰 관련 API는 PushTokenController에서 처리합니다.
  // POST /api/v1/push-tokens - 푸시 토큰 등록/업데이트 (upsert)
  // GET /api/v1/push-tokens - 내 푸시 토큰 목록 조회
  // DELETE /api/v1/push-tokens/:id - 푸시 토큰 삭제

  /**
   * 테스트 알림 전송 API (개발/테스트용)
   * POST /api/v1/notifications/test
   *
   * 개발 환경에서만 사용 가능
   */
  @Post('test')
  async sendTestNotification(
    @Body()
    body: {
      type?: NotificationType;
      title?: string;
      content?: string;
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
    },
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    // 개발 환경에서만 허용
    if (process.env.NODE_ENV === 'production') {
      throw new Error('테스트 알림은 개발 환경에서만 사용 가능합니다.');
    }

    try {
      const {
        type = NotificationType.SYSTEM,
        title = '테스트 알림',
        content = '이것은 테스트 알림입니다.',
        priority = NotificationPriority.NORMAL,
        channels = [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      } = body;

      const notifications = await this.crudService.createNotification({
        type,
        title,
        content,
        userId: user.id,
        priority,
        channels,
        triggeredBy: user.id,
        data: {
          isTest: true,
          testSentBy: user.id,
          testSentAt: new Date(),
        },
      });

      return crudResponse(notifications);
    } catch (_error) {
      this.logger.error(
        `Send test notification failed: userId=${user.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }
}
