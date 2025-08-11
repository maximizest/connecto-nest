/**
 * Rate Limiting 타입 및 인터페이스 정의
 */

/**
 * Rate Limit 범위 타입
 */
export enum RateLimitScope {
  GLOBAL = 'global', // 전역 (사용자별)
  TRAVEL = 'travel', // Travel별
  PLANET = 'planet', // Planet별
}

/**
 * Rate Limit 액션 타입
 */
export enum RateLimitAction {
  MESSAGE_SEND = 'message_send', // 메시지 전송
  MESSAGE_EDIT = 'message_edit', // 메시지 편집
  MESSAGE_DELETE = 'message_delete', // 메시지 삭제
  FILE_UPLOAD = 'file_upload', // 파일 업로드
  TYPING_INDICATOR = 'typing_indicator', // 타이핑 표시
  ROOM_JOIN = 'room_join', // 룸 입장
  ROOM_LEAVE = 'room_leave', // 룸 퇴장
}

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  scope: RateLimitScope; // 제한 범위
  action: RateLimitAction; // 제한 액션
  limit: number; // 제한 횟수
  window: number; // 시간 윈도우 (초)
  blockDuration?: number; // 차단 시간 (초, 선택사항)
  message?: string; // 제한 시 메시지
}

/**
 * Rate Limit 결과
 */
export interface RateLimitResult {
  allowed: boolean; // 허용 여부
  limit: number; // 제한 횟수
  remaining: number; // 남은 횟수
  resetTime: number; // 리셋 시간 (타임스탬프)
  retryAfter?: number; // 재시도 가능 시간 (초)
  message?: string; // 제한 메시지
}

/**
 * Rate Limit 키 정보
 */
export interface RateLimitKeyInfo {
  key: string; // Redis 키
  userId: number; // 사용자 ID
  scope: RateLimitScope; // 범위
  action: RateLimitAction; // 액션
  entityId?: number; // Travel/Planet ID
}

/**
 * Rate Limit 통계
 */
export interface RateLimitStats {
  userId: number;
  scope: RateLimitScope;
  action: RateLimitAction;
  entityId?: number;
  totalRequests: number;
  blockedRequests: number;
  lastRequestAt: string;
  lastBlockedAt?: string;
  currentWindow: {
    requests: number;
    windowStart: string;
    windowEnd: string;
  };
}

/**
 * 동적 Rate Limit 설정 (Planet 설정에서 사용)
 */
export interface DynamicRateLimitConfig {
  enabled: boolean;
  messagesPerMinute?: number;
  messagesPerHour?: number;
  filesPerHour?: number;
  burstLimit?: number; // 순간 제한
  specialLimits?: {
    [key in RateLimitAction]?: {
      limit: number;
      window: number;
    };
  };
}

/**
 * Rate Limit 예외 정보
 */
export class RateLimitExceeded extends Error {
  constructor(
    public readonly result: RateLimitResult,
    public readonly keyInfo: RateLimitKeyInfo,
  ) {
    super(result.message || 'Rate limit exceeded');
    this.name = 'RateLimitExceeded';
  }
}
