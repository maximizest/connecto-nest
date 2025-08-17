/**
 * 메시지 상태
 */
export enum MessageStatus {
  SENT = 'sent', // 전송됨
  DELIVERED = 'delivered', // 전달됨
  READ = 'read', // 읽음
  FAILED = 'failed', // 전송 실패
}
