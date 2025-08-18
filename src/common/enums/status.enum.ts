/**
 * 공통 상태 열거형
 *
 * 여러 엔티티에서 공통으로 사용되는 상태 값들
 */
export enum CommonStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

/**
 * 엔티티별 상태 타입 별칭
 */
export type UserStatus = CommonStatus.ACTIVE | CommonStatus.BANNED;
export type TravelUserStatus = CommonStatus.ACTIVE | CommonStatus.BANNED;
export type PlanetUserStatus = CommonStatus.ACTIVE | CommonStatus.BANNED;
export type TravelStatus = CommonStatus.ACTIVE | CommonStatus.INACTIVE;
export type PlanetStatus = CommonStatus.ACTIVE | CommonStatus.INACTIVE;
