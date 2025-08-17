/**
 * 알림 채널
 */
export enum NotificationChannel {
  IN_APP = 'in_app', // 인앱 알림
  PUSH = 'push', // 푸시 알림
  EMAIL = 'email', // 이메일
  SMS = 'sms', // SMS (미래 확장)
  WEBSOCKET = 'websocket', // WebSocket 실시간 알림
}
