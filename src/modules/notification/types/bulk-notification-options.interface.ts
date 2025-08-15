import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../notification.entity';

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