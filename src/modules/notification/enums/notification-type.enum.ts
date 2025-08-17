/**
 * 알림 타입 - 단순화된 5가지 핵심 타입
 */
export enum NotificationType {
  MESSAGE = 'message', // 새 메시지
  MENTION = 'mention', // 메시지에서 멘션
  REPLY = 'reply', // 메시지 답글
  BANNED = 'banned', // 사용자 차단
  SYSTEM = 'system', // 시스템 공지/점검/업데이트
}
