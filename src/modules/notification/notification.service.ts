import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from './notification.entity';

/**
 * 알림 생성 옵션
 */
export interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  content: string;
  userId: number;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  travelId?: number;
  planetId?: number;
  messageId?: number;
  triggeredBy?: number;
  scheduledAt?: Date;
  expiresAt?: Date;
  data?: any;
  metadata?: any;
}

/**
 * 대량 알림 생성 옵션
 */
export interface BulkNotificationOptions {
  type: NotificationType;
  title: string;
  content: string;
  userIds: number[];
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  travelId?: number;
  planetId?: number;
  messageId?: number;
  triggeredBy?: number;
  scheduledAt?: Date;
  expiresAt?: Date;
  data?: any;
  metadata?: any;
}

/**
 * 알림 통계 정보
 */
export interface NotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  notificationsByType: Record<NotificationType, number>;
  notificationsByPriority: Record<NotificationPriority, number>;
  notificationsByStatus: Record<NotificationStatus, number>;
  recentNotifications: Notification[];
}

@Injectable()
export class NotificationService extends CrudService<Notification> {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    public readonly repository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(repository);
  }

  /**
   * 단일 알림 생성
   */
  async createNotification(
    options: CreateNotificationOptions,
  ): Promise<Notification> {
    try {
      const notification = this.repository.create({
        type: options.type,
        title: options.title,
        content: options.content,
        userId: options.userId,
        priority: options.priority || NotificationPriority.NORMAL,
        channels: options.channels || [NotificationChannel.IN_APP],
        travelId: options.travelId,
        planetId: options.planetId,
        messageId: options.messageId,
        triggeredBy: options.triggeredBy,
        scheduledAt: options.scheduledAt,
        expiresAt: options.expiresAt,
        data: options.data,
        metadata: {
          ...options.metadata,
          createdBy: 'system',
          batchId: `single_${Date.now()}`,
        },
      });

      const savedNotification = await this.repository.save(notification);

      // 알림 생성 이벤트 발행
      this.eventEmitter.emit('notification.created', {
        notification: savedNotification,
        options,
      });

      // 즉시 전송 또는 예약 처리
      if (!options.scheduledAt || options.scheduledAt <= new Date()) {
        await this.sendNotification(savedNotification);
      }

      this.logger.log(
        `Notification created: id=${savedNotification.id}, type=${options.type}, userId=${options.userId}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 대량 알림 생성
   */
  async createBulkNotifications(
    options: BulkNotificationOptions,
  ): Promise<Notification[]> {
    try {
      const batchId = `bulk_${Date.now()}`;
      const notifications: Partial<Notification>[] = options.userIds.map(
        (userId) => ({
          type: options.type,
          title: options.title,
          content: options.content,
          userId,
          priority: options.priority || NotificationPriority.NORMAL,
          channels: options.channels || [NotificationChannel.IN_APP],
          travelId: options.travelId,
          planetId: options.planetId,
          messageId: options.messageId,
          triggeredBy: options.triggeredBy,
          scheduledAt: options.scheduledAt,
          expiresAt: options.expiresAt,
          data: options.data,
          metadata: {
            ...options.metadata,
            createdBy: 'system',
            batchId,
          },
        }),
      );

      const savedNotifications = await this.repository.save(notifications);

      // 대량 알림 생성 이벤트 발행
      this.eventEmitter.emit('notifications.bulk_created', {
        notifications: savedNotifications,
        options,
        batchId,
      });

      // 즉시 전송 또는 예약 처리
      if (!options.scheduledAt || options.scheduledAt <= new Date()) {
        await Promise.all(
          savedNotifications.map((notification) =>
            this.sendNotification(notification),
          ),
        );
      }

      this.logger.log(
        `Bulk notifications created: count=${savedNotifications.length}, type=${options.type}, batchId=${batchId}`,
      );

      return savedNotifications;
    } catch (error) {
      this.logger.error(
        `Failed to create bulk notifications: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 알림 전송
   */
  async sendNotification(notification: Notification): Promise<void> {
    try {
      if (!notification.canBeSent()) {
        this.logger.warn(`Notification ${notification.id} cannot be sent`);
        return;
      }

      // 각 채널별로 전송
      for (const channel of notification.channels) {
        try {
          await this.sendToChannel(notification, channel);
          notification.markAsDelivered(channel);
        } catch (error) {
          this.logger.error(
            `Failed to send to channel ${channel}: ${error.message}`,
          );
          notification.markAsFailed(channel, error.message);
        }
      }

      // 전송 결과 저장
      await this.repository.save(notification);

      // 전송 완료 이벤트 발행
      this.eventEmitter.emit('notification.sent', {
        notification,
        timestamp: new Date(),
      });

      this.logger.debug(`Notification ${notification.id} sent successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notification.id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 특정 채널로 알림 전송
   */
  private async sendToChannel(
    notification: Notification,
    channel: NotificationChannel,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.IN_APP:
        await this.sendInAppNotification(notification);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification);
        break;
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(notification);
        break;
      case NotificationChannel.WEBSOCKET:
        await this.sendWebSocketNotification(notification);
        break;
      case NotificationChannel.SMS:
        await this.sendSMSNotification(notification);
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * 인앱 알림 전송
   */
  private async sendInAppNotification(
    notification: Notification,
  ): Promise<void> {
    // 인앱 알림은 DB 저장으로 처리 완료
    this.logger.debug(`In-app notification stored: ${notification.id}`);
  }

  /**
   * 푸시 알림 전송
   */
  private async sendPushNotification(
    notification: Notification,
  ): Promise<void> {
    // 푸시 알림 서비스 연동 (Firebase, APNs 등)
    this.eventEmitter.emit('notification.push', {
      notification,
      payload: {
        title: notification.title,
        body: notification.content,
        badge: notification.data?.badge,
        sound: notification.data?.sound,
        category: notification.data?.category,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...notification.data?.customData,
        },
      },
    });

    this.logger.debug(`Push notification queued: ${notification.id}`);
  }

  /**
   * 이메일 알림 전송
   */
  private async sendEmailNotification(
    notification: Notification,
  ): Promise<void> {
    // 이메일 서비스 연동
    this.eventEmitter.emit('notification.email', {
      notification,
      recipient: notification.userId,
      subject: notification.title,
      content: notification.content,
      template: `notification_${notification.type}`,
    });

    this.logger.debug(`Email notification queued: ${notification.id}`);
  }

  /**
   * WebSocket 실시간 알림 전송
   */
  private async sendWebSocketNotification(
    notification: Notification,
  ): Promise<void> {
    // WebSocket으로 실시간 알림 전송
    this.eventEmitter.emit('notification.websocket', {
      notification,
      userId: notification.userId,
      event: 'notification:received',
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        priority: notification.priority,
        data: notification.data,
        createdAt: notification.createdAt,
      },
    });

    this.logger.debug(`WebSocket notification sent: ${notification.id}`);
  }

  /**
   * SMS 알림 전송
   */
  private async sendSMSNotification(notification: Notification): Promise<void> {
    // SMS 서비스 연동 (미래 확장)
    this.logger.debug(`SMS notification queued: ${notification.id}`);
  }

  /**
   * 사용자의 알림 목록 조회
   */
  async getUserNotifications(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
      priorities?: NotificationPriority[];
    } = {},
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        types,
        priorities,
      } = options;

      const queryBuilder = this.repository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .leftJoinAndSelect('notification.triggerUser', 'triggerUser')
        .leftJoinAndSelect('notification.travel', 'travel')
        .leftJoinAndSelect('notification.planet', 'planet')
        .orderBy('notification.createdAt', 'DESC');

      if (unreadOnly) {
        queryBuilder.andWhere('notification.isRead = :isRead', {
          isRead: false,
        });
      }

      if (types && types.length > 0) {
        queryBuilder.andWhere('notification.type IN (:...types)', { types });
      }

      if (priorities && priorities.length > 0) {
        queryBuilder.andWhere('notification.priority IN (:...priorities)', {
          priorities,
        });
      }

      const total = await queryBuilder.getCount();

      const notifications = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();

      const unreadCount = await this.repository.count({
        where: { userId, isRead: false },
      });

      return {
        notifications,
        total,
        unreadCount,
        hasMore: total > page * limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<Notification> {
    try {
      const notification = await this.repository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.isRead) {
        notification.markAsRead();
        await this.repository.save(notification);

        // 읽음 처리 이벤트 발행
        this.eventEmitter.emit('notification.read', {
          notification,
          userId,
          readAt: notification.readAt,
        });
      }

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to mark notification as read: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 여러 알림 일괄 읽음 처리
   */
  async markMultipleAsRead(
    notificationIds: number[],
    userId: number,
  ): Promise<number> {
    try {
      const result = await this.repository.update(
        {
          id: notificationIds.length > 0 ? (notificationIds as any) : undefined,
          userId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
          status: NotificationStatus.READ,
        },
      );

      const affectedCount = result.affected || 0;

      // 일괄 읽음 처리 이벤트 발행
      this.eventEmitter.emit('notifications.bulk_read', {
        notificationIds,
        userId,
        affectedCount,
        readAt: new Date(),
      });

      this.logger.log(
        `Marked ${affectedCount} notifications as read for user ${userId}`,
      );

      return affectedCount;
    } catch (error) {
      this.logger.error(
        `Failed to mark multiple notifications as read: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<number> {
    try {
      const result = await this.repository.update(
        { userId, isRead: false },
        {
          isRead: true,
          readAt: new Date(),
          status: NotificationStatus.READ,
        },
      );

      const affectedCount = result.affected || 0;

      // 전체 읽음 처리 이벤트 발행
      this.eventEmitter.emit('notifications.all_read', {
        userId,
        affectedCount,
        readAt: new Date(),
      });

      this.logger.log(
        `Marked all ${affectedCount} notifications as read for user ${userId}`,
      );

      return affectedCount;
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 사용자 알림 통계 조회
   */
  async getUserNotificationStats(userId: number): Promise<NotificationStats> {
    try {
      const notifications = await this.repository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10, // 최근 10개
      });

      const totalNotifications = await this.repository.count({
        where: { userId },
      });
      const unreadNotifications = await this.repository.count({
        where: { userId, isRead: false },
      });

      // 타입별 통계
      const typeStats = await this.repository
        .createQueryBuilder('notification')
        .select('notification.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.type')
        .getRawMany();

      const notificationsByType = typeStats.reduce(
        (acc, stat) => {
          acc[stat.type as NotificationType] = parseInt(stat.count);
          return acc;
        },
        {} as Record<NotificationType, number>,
      );

      // 우선순위별 통계
      const priorityStats = await this.repository
        .createQueryBuilder('notification')
        .select('notification.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.priority')
        .getRawMany();

      const notificationsByPriority = priorityStats.reduce(
        (acc, stat) => {
          acc[stat.priority as NotificationPriority] = parseInt(stat.count);
          return acc;
        },
        {} as Record<NotificationPriority, number>,
      );

      // 상태별 통계
      const statusStats = await this.repository
        .createQueryBuilder('notification')
        .select('notification.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.status')
        .getRawMany();

      const notificationsByStatus = statusStats.reduce(
        (acc, stat) => {
          acc[stat.status as NotificationStatus] = parseInt(stat.count);
          return acc;
        },
        {} as Record<NotificationStatus, number>,
      );

      return {
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        notificationsByPriority,
        notificationsByStatus,
        recentNotifications: notifications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user notification stats: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 만료된 알림 정리
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await this.repository.delete({
        expiresAt: 'LessThan' as any,
        status: NotificationStatus.DELIVERED,
      });

      const deletedCount = result.affected || 0;

      this.logger.log(`Cleaned up ${deletedCount} expired notifications`);

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired notifications: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * 예약된 알림 처리
   */
  async processScheduledNotifications(): Promise<number> {
    try {
      const scheduledNotifications = await this.repository.find({
        where: {
          status: NotificationStatus.PENDING,
          scheduledAt: 'LessThanOrEqual' as any,
        },
        take: 100, // 한번에 100개씩 처리
      });

      let processedCount = 0;

      for (const notification of scheduledNotifications) {
        try {
          await this.sendNotification(notification);
          processedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send scheduled notification ${notification.id}: ${error.message}`,
          );
        }
      }

      if (processedCount > 0) {
        this.logger.log(`Processed ${processedCount} scheduled notifications`);
      }

      return processedCount;
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled notifications: ${error.message}`,
      );
      return 0;
    }
  }
}
