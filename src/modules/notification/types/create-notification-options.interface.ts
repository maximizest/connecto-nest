import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../notification.entity';

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
