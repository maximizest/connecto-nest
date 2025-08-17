/**
 * Rate Limit 범위 타입
 */
export enum RateLimitScope {
  GLOBAL = 'global', // 전역 (사용자별)
  TRAVEL = 'travel', // Travel별
  PLANET = 'planet', // Planet별
}
