import {
  AfterUpdate,
  BeforeCreate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
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
import { NotificationStatus } from '../../enums/notification-status.enum';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationService } from '../../notification.service';
import { PushNotificationService } from '../../services/push-notification.service';

/**
 * Notification API Controller (v1)
 *
 * Travel/Planet 알림 시스템 관리를 위한 REST API
 *
 * 주요 기능:
 * - 사용자 알림 목록 조회
 * - 알림 읽음 처리
 * - 알림 설정 관리
 * - 푸시 토큰 관리
 * - 알림 통계 조회
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
    private readonly pushNotificationService: PushNotificationService,
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

  /**
   * 푸시 토큰 등록 API
   * POST /api/v1/notifications/push-token
   */
  @Post('push-token')
  async registerPushToken(
    @Body()
    body: {
      token: string;
      platform: 'ios' | 'android' | 'web';
      deviceId: string;
      appVersion?: string;
    },
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const { token, platform, deviceId, appVersion } = body;

      if (!token || !platform || !deviceId) {
        throw new Error('토큰, 플랫폼, 디바이스 ID가 필요합니다.');
      }

      await this.pushNotificationService.registerPushToken(
        user.id,
        token,
        platform,
        deviceId,
        appVersion,
      );

      // Create virtual Notification entity with push token registration
      const pushTokenEntity = Object.assign(new Notification(), {
        id: 0,
        type: NotificationType.SYSTEM,
        title: '푸시 토큰 등록',
        content: `${platform} 디바이스에 푸시 토큰 등록 완료`,
        userId: user.id,
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP],
        status: NotificationStatus.DELIVERED,
        data: {
          platform,
          deviceId,
          registeredAt: new Date(),
        },
      });

      return crudResponse(pushTokenEntity);
    } catch (error) {
      this.logger.error(
        `Register push token failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 푸시 토큰 해제 API
   * POST /api/v1/notifications/push-token/unregister
   */
  @Post('push-token/unregister')
  async unregisterPushToken(
    @Body() body: { deviceId: string },
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const { deviceId } = body;

      if (!deviceId) {
        throw new Error('디바이스 ID가 필요합니다.');
      }

      await this.pushNotificationService.unregisterPushToken(user.id, deviceId);

      // Create virtual Notification entity with push token unregistration
      const unregisterEntity = Object.assign(new Notification(), {
        id: 0,
        type: NotificationType.SYSTEM,
        title: '푸시 토큰 해제',
        content: `디바이스 ${deviceId} 푸시 토큰 해제 완료`,
        userId: user.id,
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP],
        status: NotificationStatus.DELIVERED,
        data: {
          deviceId,
          unregisteredAt: new Date(),
        },
      });

      return crudResponse(unregisterEntity);
    } catch (error) {
      this.logger.error(
        `Unregister push token failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 내 푸시 토큰 목록 조회 API
   * GET /api/v1/notifications/push-tokens
   */
  @Get('push-tokens')
  async getMyPushTokens(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    try {
      const pushTokens = await this.pushNotificationService.getUserPushTokens(
        user.id,
      );

      // Create virtual Notification entity with push token list
      const tokenListEntity = Object.assign(new Notification(), {
        id: 0,
        type: NotificationType.SYSTEM,
        title: '푸시 토큰 목록',
        content: `등록된 디바이스 ${pushTokens.length}개 (활성: ${pushTokens.filter((t) => t.isActive).length}개)`,
        userId: user.id,
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP],
        status: NotificationStatus.DELIVERED,
        data: {
          tokens: pushTokens.map((token) => ({
            deviceId: token.deviceId,
            platform: token.platform,
            appVersion: token.appVersion,
            isActive: token.isActive,
            createdAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
          })),
          totalCount: pushTokens.length,
          activeCount: pushTokens.filter((token) => token.isActive).length,
          retrievedAt: new Date(),
        },
      });

      return crudResponse(tokenListEntity);
    } catch (error) {
      this.logger.error(
        `Get my push tokens failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

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
    } catch (error) {
      this.logger.error(
        `Send test notification failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
