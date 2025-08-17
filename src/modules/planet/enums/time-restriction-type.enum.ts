/**
 * 시간 제한 타입
 */
export enum TimeRestrictionType {
  NONE = 'none', // 제한 없음
  DAILY = 'daily', // 매일 특정 시간
  WEEKLY = 'weekly', // 매주 특정 요일
  CUSTOM = 'custom', // 사용자 정의
}
