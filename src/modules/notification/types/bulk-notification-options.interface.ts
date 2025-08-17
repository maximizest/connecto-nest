import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../notification.entity';

/**
 * 대량 알림 생성 옵션
 *
 * @note 각 사용자별, 채널별로 개별 알림이 생성됩니다.
 * 예: userIds: [1, 2], channels: [IN_APP, PUSH] → 총 4개의 개별 알림 생성
 */
export interface BulkNotificationOptions {
  type: NotificationType;
  title: string;
  content: string;
  userIds: number[];
  priority?: NotificationPriority;
  /** 각 사용자별, 채널별로 개별 알림이 생성됩니다 */
  channels?: NotificationChannel[];
  travelId?: number;
  planetId?: number;
  messageId?: number;
  triggeredBy?: number;
  scheduledAt?: Date;
  expiresAt?: Date;
  data?: any;
}
