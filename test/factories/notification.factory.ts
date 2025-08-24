import { Factory } from 'fishery';
import { Notification } from '../../src/modules/notification/notification.entity';
import { NotificationType } from '../../src/modules/notification/enums/notification-type.enum';
import { NotificationPriority } from '../../src/modules/notification/enums/notification-priority.enum';
import { NotificationStatus } from '../../src/modules/notification/enums/notification-status.enum';
import { NotificationChannel } from '../../src/modules/notification/enums/notification-channel.enum';

/**
 * Notification Factory - Fishery를 사용한 알림 테스트 데이터 생성
 */
export const NotificationFactory = Factory.define<Notification>(({ sequence, params }) => {
  const notification = new Notification();

  // 기본 정보
  notification.id = sequence;
  notification.userId = params.userId || sequence;
  notification.type = NotificationType.MESSAGE;
  notification.title = `새로운 메시지가 도착했습니다`;
  notification.body = `테스트 사용자${sequence}님이 메시지를 보냈습니다.`;

  // 우선순위 및 상태
  notification.priority = NotificationPriority.NORMAL;
  notification.status = NotificationStatus.PENDING;
  notification.channel = NotificationChannel.PUSH;

  // 관계 ID (선택적)
  notification.travelId = params.travelId || null;
  notification.planetId = params.planetId || null;

  // 메타데이터
  notification.metadata = {
    messageId: sequence,
    senderName: `테스트 사용자${sequence}`,
  };

  // 타임스탬프
  notification.createdAt = new Date();
  notification.updatedAt = new Date();

  return notification;
});

/**
 * 전송된 알림 Factory
 */
export const SentNotificationFactory = NotificationFactory.params({
  status: NotificationStatus.SENT,
  sentAt: new Date(),
});

/**
 * 읽은 알림 Factory
 */
export const ReadNotificationFactory = NotificationFactory.params({
  status: NotificationStatus.READ,
  readAt: new Date(),
});

/**
 * 여행 알림 Factory
 */
export const TravelNotificationFactory = NotificationFactory.params({
  type: NotificationType.TRAVEL_INVITATION,
  title: '여행 초대',
  body: '새로운 여행에 초대되었습니다!',
});

/**
 * 미션 알림 Factory
 */
export const MissionNotificationFactory = NotificationFactory.params({
  type: NotificationType.MISSION_ASSIGNED,
  title: '새로운 미션',
  body: '새로운 미션이 할당되었습니다!',
  priority: NotificationPriority.HIGH,
});

/**
 * 시스템 알림 Factory
 */
export const SystemNotificationFactory = NotificationFactory.params({
  type: NotificationType.SYSTEM,
  title: '시스템 공지',
  body: '시스템 점검이 예정되어 있습니다.',
  priority: NotificationPriority.LOW,
  channel: NotificationChannel.EMAIL,
});

/**
 * 예약된 알림 Factory
 */
export const ScheduledNotificationFactory = NotificationFactory.params({
  status: NotificationStatus.PENDING,
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
});