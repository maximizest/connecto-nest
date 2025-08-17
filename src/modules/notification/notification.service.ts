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
import { BulkNotificationOptions } from './types/bulk-notification-options.interface';
import { CreateNotificationOptions } from './types/create-notification-options.interface';

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
   * 단일 알림 생성 - 채널별로 개별 생성
   */
  async createNotification(
    options: CreateNotificationOptions,
  ): Promise<Notification[]> {
    try {
      const channels = options.channels || [NotificationChannel.IN_APP];
      const notifications: Notification[] = [];
      const batchId = `single_${Date.now()}`;

      // 각 채널별로 개별 알림 생성
      for (const channel of channels) {
        const notification = this.repository.create({
          type: options.type,
          title: options.title,
          content: options.content,
          userId: options.userId,
          priority: options.priority || NotificationPriority.NORMAL,
          channels: [channel], // 단일 채널만
          travelId: options.travelId,
          planetId: options.planetId,
          messageId: options.messageId,
          triggeredBy: options.triggeredBy,
          scheduledAt: options.scheduledAt,
          expiresAt: options.expiresAt,
          data: {
            ...options.data,
            system: {
              createdBy: 'system',
              batchId,
              channel,
            },
          },
        });

        const savedNotification = await this.repository.save(notification);
        notifications.push(savedNotification);

        // 즉시 전송 또는 예약 처리
        if (!options.scheduledAt || options.scheduledAt <= new Date()) {
          await this.sendNotification(savedNotification);
        }
      }

      // 알림 생성 이벤트 발행
      this.eventEmitter.emit('notification.created', {
        notifications,
        options,
        batchId,
      });

      this.logger.log(
        `Notifications created: count=${notifications.length}, type=${options.type}, userId=${options.userId}, batchId=${batchId}`,
      );

      return notifications;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * 대량 알림 생성 - 채널별로 개별 생성
   */
  async createBulkNotifications(
    options: BulkNotificationOptions,
  ): Promise<Notification[]> {
    try {
      const batchId = `bulk_${Date.now()}`;
      const channels = options.channels || [NotificationChannel.IN_APP];
      const notifications: Partial<Notification>[] = [];

      // 각 사용자별, 채널별로 개별 알림 생성
      for (const userId of options.userIds) {
        for (const channel of channels) {
          notifications.push({
            type: options.type,
            title: options.title,
            content: options.content,
            userId,
            priority: options.priority || NotificationPriority.NORMAL,
            channels: [channel], // 단일 채널만
            travelId: options.travelId,
            planetId: options.planetId,
            messageId: options.messageId,
            triggeredBy: options.triggeredBy,
            scheduledAt: options.scheduledAt,
            expiresAt: options.expiresAt,
            data: {
              ...options.data,
              system: {
                createdBy: 'system',
                batchId,
                channel,
              },
            },
          });
        }
      }

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
   * 알림 전송 - 단일 채널만 처리
   */
  async sendNotification(notification: Notification): Promise<void> {
    try {
      if (!notification.canBeSent()) {
        this.logger.warn(`Notification ${notification.id} cannot be sent`);
        return;
      }

      const channel = notification.channels[0]; // 단일 채널만 존재

      try {
        notification.status = NotificationStatus.SENT;
        await this.sendToChannel(notification, channel);
        notification.markAsDelivered();

        this.logger.debug(
          `Notification ${notification.id} sent successfully to ${channel}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send to channel ${channel}: ${error.message}`,
        );
        notification.markAsFailed(error.message);
      }

      // 전송 결과 저장
      await this.repository.save(notification);

      // 전송 완료 이벤트 발행
      this.eventEmitter.emit('notification.sent', {
        notification,
        channel,
        timestamp: new Date(),
      });
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
      types?: NotificationType[];
      priorities?: NotificationPriority[];
    } = {},
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
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

      return {
        notifications,
        total,
        hasMore: total > page * limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
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
