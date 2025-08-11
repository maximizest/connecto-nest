import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../../user/user.entity';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../../notification.entity';
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
    'isRead',
    'travelId',
    'planetId',
    'createdAt',
  ],
  allowedParams: [],
  allowedIncludes: ['triggerUser', 'travel', 'planet'],
  only: ['index', 'show'],
  routes: {
    index: {
      allowedFilters: [
        'type',
        'priority',
        'isRead',
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자별 알림 필터링
   */
  @BeforeCreate()
  @BeforeUpdate()
  async preprocessData(entity: Notification, context: any) {
    const user: User = context.request?.user;

    if (user) {
      // 사용자는 자신의 알림만 조회 가능하도록 필터링
      if (context.request?.method === 'GET') {
        entity.userId = user.id;
      }
    }

    return entity;
  }

  /**
   * 내 알림 목록 조회 API
   * GET /api/v1/notifications/my
   */
  @Get('my')
  async getMyNotifications(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unreadOnly') unreadOnly: boolean = false,
    @Query('types') types?: string,
    @Query('priorities') priorities?: string,
  ) {
    const user: User = req.user;

    try {
      const typeFilter = types
        ? (types.split(',') as NotificationType[])
        : undefined;
      const priorityFilter = priorities
        ? (priorities.split(',') as NotificationPriority[])
        : undefined;

      const result = await this.crudService.getUserNotifications(user.id, {
        page: Math.max(1, page),
        limit: Math.min(100, Math.max(1, limit)),
        unreadOnly,
        types: typeFilter,
        priorities: priorityFilter,
      });

      return {
        success: true,
        message: '알림 목록을 가져왔습니다.',
        data: {
          ...result,
          user: {
            id: user.id,
            name: user.name,
          },
          filters: {
            page,
            limit,
            unreadOnly,
            types: typeFilter,
            priorities: priorityFilter,
          },
          requestedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get my notifications failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 읽지 않은 알림 개수 조회 API
   * GET /api/v1/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const user: User = req.user;

    try {
      const stats = await this.crudService.getUserNotificationStats(user.id);

      return {
        success: true,
        message: '읽지 않은 알림 개수를 가져왔습니다.',
        data: {
          userId: user.id,
          unreadCount: stats.unreadNotifications,
          totalCount: stats.totalNotifications,
          checkedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get unread count failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 알림 상세 조회 API
   * GET /api/v1/notifications/:id
   */
  @Get(':id')
  async getNotificationDetail(
    @Param('id') notificationId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const notification = await this.crudService.repository.findOne({
        where: { id: notificationId, userId: user.id },
        relations: ['triggerUser', 'travel', 'planet'],
      });

      if (!notification) {
        throw new NotFoundException('알림을 찾을 수 없습니다.');
      }

      return {
        success: true,
        message: '알림 상세 정보를 가져왔습니다.',
        data: {
          notification,
          viewedBy: user.id,
          viewedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get notification detail failed: notificationId=${notificationId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 알림 읽음 처리 API
   * PATCH /api/v1/notifications/:id/read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: number, @Request() req: any) {
    const user: User = req.user;

    try {
      const notification = await this.crudService.markAsRead(
        notificationId,
        user.id,
      );

      return {
        success: true,
        message: '알림을 읽음으로 처리했습니다.',
        data: {
          notification: {
            id: notification.id,
            isRead: notification.isRead,
            readAt: notification.readAt,
          },
          readBy: user.id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Mark as read failed: notificationId=${notificationId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 여러 알림 일괄 읽음 처리 API
   * PATCH /api/v1/notifications/read-multiple
   */
  @Patch('read-multiple')
  async markMultipleAsRead(
    @Body() body: { notificationIds: number[] },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { notificationIds } = body;

      if (
        !notificationIds ||
        !Array.isArray(notificationIds) ||
        notificationIds.length === 0
      ) {
        throw new Error('알림 ID 목록이 필요합니다.');
      }

      const affectedCount = await this.crudService.markMultipleAsRead(
        notificationIds,
        user.id,
      );

      return {
        success: true,
        message: `${affectedCount}개 알림을 읽음으로 처리했습니다.`,
        data: {
          affectedCount,
          requestedIds: notificationIds,
          readBy: user.id,
          readAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Mark multiple as read failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 모든 알림 읽음 처리 API
   * PATCH /api/v1/notifications/read-all
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const user: User = req.user;

    try {
      const affectedCount = await this.crudService.markAllAsRead(user.id);

      return {
        success: true,
        message: `모든 알림(${affectedCount}개)을 읽음으로 처리했습니다.`,
        data: {
          affectedCount,
          readBy: user.id,
          readAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Mark all as read failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 알림 통계 조회 API
   * GET /api/v1/notifications/stats
   */
  @Get('stats')
  async getNotificationStats(@Request() req: any) {
    const user: User = req.user;

    try {
      const stats = await this.crudService.getUserNotificationStats(user.id);

      return {
        success: true,
        message: '알림 통계를 가져왔습니다.',
        data: {
          ...stats,
          userId: user.id,
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get notification stats failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

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
    @Request() req: any,
  ) {
    const user: User = req.user;

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

      return {
        success: true,
        message: '푸시 토큰이 등록되었습니다.',
        data: {
          userId: user.id,
          platform,
          deviceId,
          registeredAt: new Date(),
        },
      };
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
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { deviceId } = body;

      if (!deviceId) {
        throw new Error('디바이스 ID가 필요합니다.');
      }

      await this.pushNotificationService.unregisterPushToken(user.id, deviceId);

      return {
        success: true,
        message: '푸시 토큰이 해제되었습니다.',
        data: {
          userId: user.id,
          deviceId,
          unregisteredAt: new Date(),
        },
      };
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
  async getMyPushTokens(@Request() req: any) {
    const user: User = req.user;

    try {
      const pushTokens = await this.pushNotificationService.getUserPushTokens(
        user.id,
      );

      return {
        success: true,
        message: '푸시 토큰 목록을 가져왔습니다.',
        data: {
          userId: user.id,
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
      };
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
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const {
        type = NotificationType.SYSTEM_ANNOUNCEMENT,
        title = '테스트 알림',
        content = '이것은 테스트 알림입니다.',
        priority = NotificationPriority.NORMAL,
        channels = [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      } = body;

      const notification = await this.crudService.createNotification({
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

      return {
        success: true,
        message: '테스트 알림이 전송되었습니다.',
        data: {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            priority: notification.priority,
            channels: notification.channels,
          },
          sentTo: user.id,
          sentAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Send test notification failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
