import {
  RateLimitAction,
  RateLimitConfig,
  RateLimitScope,
} from '../types/rate-limit.types';

/**
 * Rate Limiting 상수 정의
 */

/**
 * 기본 Rate Limit 설정들
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // 전역 사용자 제한 (스팸 방지)
  GLOBAL_MESSAGE_SEND: {
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.MESSAGE_SEND,
    limit: 60, // 1분에 60개
    window: 60,
    blockDuration: 300, // 5분 차단
    message: '메시지 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  },

  GLOBAL_FILE_UPLOAD: {
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.FILE_UPLOAD,
    limit: 10, // 1분에 10개
    window: 60,
    blockDuration: 600, // 10분 차단
    message: '파일 업로드 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  },

  // Travel별 제한
  TRAVEL_MESSAGE_SEND: {
    scope: RateLimitScope.TRAVEL,
    action: RateLimitAction.MESSAGE_SEND,
    limit: 100, // 1분에 100개 (Travel 전체)
    window: 60,
    message: 'Travel 내 메시지 전송이 일시적으로 제한되었습니다.',
  },

  // Planet별 제한
  PLANET_MESSAGE_SEND: {
    scope: RateLimitScope.PLANET,
    action: RateLimitAction.MESSAGE_SEND,
    limit: 30, // 1분에 30개 (Planet별 사용자당)
    window: 60,
    message: 'Planet 내 메시지 전송이 일시적으로 제한되었습니다.',
  },

  PLANET_FILE_UPLOAD: {
    scope: RateLimitScope.PLANET,
    action: RateLimitAction.FILE_UPLOAD,
    limit: 5, // 1분에 5개
    window: 60,
    blockDuration: 300, // 5분 차단
    message: 'Planet 내 파일 업로드가 일시적으로 제한되었습니다.',
  },

  // 타이핑 표시 제한
  PLANET_TYPING: {
    scope: RateLimitScope.PLANET,
    action: RateLimitAction.TYPING_INDICATOR,
    limit: 10, // 1분에 10번
    window: 60,
    message: '타이핑 표시가 일시적으로 제한되었습니다.',
  },

  // 메시지 편집/삭제 제한
  GLOBAL_MESSAGE_EDIT: {
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.MESSAGE_EDIT,
    limit: 20, // 1분에 20개
    window: 60,
    message: '메시지 편집 한도를 초과했습니다.',
  },

  GLOBAL_MESSAGE_DELETE: {
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.MESSAGE_DELETE,
    limit: 10, // 1분에 10개
    window: 60,
    message: '메시지 삭제 한도를 초과했습니다.',
  },

  // 룸 입장/퇴장 제한
  GLOBAL_ROOM_JOIN: {
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.ROOM_JOIN,
    limit: 30, // 1분에 30번
    window: 60,
    message: '룸 입장이 일시적으로 제한되었습니다.',
  },
};

/**
 * Rate Limit Redis 키 접두사
 */
export const RATE_LIMIT_KEY_PREFIX = 'rate_limit';

/**
 * Rate Limit 통계 키 접두사
 */
export const RATE_LIMIT_STATS_PREFIX = 'rate_limit_stats';

/**
 * 차단 목록 키 접두사
 */
export const RATE_LIMIT_BLOCKED_PREFIX = 'rate_limit_blocked';

/**
 * Planet별 동적 제한 설정 기본값
 */
export const DEFAULT_PLANET_RATE_LIMITS = {
  messagesPerMinute: 30,
  messagesPerHour: 500,
  filesPerHour: 50,
  burstLimit: 5, // 5초에 5개
  specialLimits: {
    [RateLimitAction.FILE_UPLOAD]: {
      limit: 5,
      window: 300, // 5분
    },
    [RateLimitAction.TYPING_INDICATOR]: {
      limit: 10,
      window: 60, // 1분
    },
  },
};

/**
 * Travel별 동적 제한 설정 기본값
 */
export const DEFAULT_TRAVEL_RATE_LIMITS = {
  messagesPerMinute: 100,
  messagesPerHour: 2000,
  filesPerHour: 200,
  burstLimit: 10,
};

/**
 * Rate Limit 우선순위 (낮을수록 먼저 체크)
 */
export const RATE_LIMIT_PRIORITY = {
  [RateLimitScope.GLOBAL]: 1,
  [RateLimitScope.TRAVEL]: 2,
  [RateLimitScope.PLANET]: 3,
};

/**
 * 메시지 타입별 Rate Limit 승수
 */
export const MESSAGE_TYPE_MULTIPLIERS = {
  TEXT: 1.0,
  IMAGE: 2.0,
  VIDEO: 3.0,
  FILE: 2.5,
  SYSTEM: 0.1, // 시스템 메시지는 거의 제한 없음
};

/**
 * VIP 사용자 Rate Limit 승수 (더 관대한 제한)
 */
export const VIP_RATE_LIMIT_MULTIPLIER = 2.0;

/**
 * 신규 사용자 Rate Limit 승수 (더 엄격한 제한)
 */
export const NEW_USER_RATE_LIMIT_MULTIPLIER = 0.5;

/**
 * Rate Limit 경고 임계값 (제한의 몇 %에서 경고)
 */
export const RATE_LIMIT_WARNING_THRESHOLD = 0.8; // 80%
