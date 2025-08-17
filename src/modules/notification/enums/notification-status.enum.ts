/**
 * 알림 상태 - 자동 업데이트만
 */
export enum NotificationStatus {
  PENDING = 'pending', // 대기 중
  SENT = 'sent', // 전송됨
  DELIVERED = 'delivered', // 배달됨
  FAILED = 'failed', // 실패
}
