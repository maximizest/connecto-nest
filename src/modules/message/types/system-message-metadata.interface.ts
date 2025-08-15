/**
 * 시스템 메시지 메타데이터
 */
export interface SystemMessageMetadata {
  action: string; // 액션 타입 (join, leave, ban, etc.)
  userId?: number; // 대상 사용자 ID
  oldValue?: any; // 변경 전 값
  newValue?: any; // 변경 후 값
  reason?: string; // 사유
}