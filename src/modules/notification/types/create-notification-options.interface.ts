import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * 알림 생성 옵션
 *
 * @note channels 배열의 각 채널별로 개별 알림이 생성됩니다.
 * 예: [IN_APP, PUSH] → 2개의 개별 알림 생성
 */
export interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  content: string;
  userId: number;
  priority?: NotificationPriority;
  /** 각 채널별로 개별 알림이 생성됩니다 */
  channels?: NotificationChannel[];
  travelId?: number;
  planetId?: number;
  messageId?: number;
  triggeredBy?: number;
  scheduledAt?: Date;
  expiresAt?: Date;
  data?: any;
}
