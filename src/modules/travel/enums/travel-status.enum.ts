/**
 * Travel 상태
 */
export enum TravelStatus {
  INACTIVE = 'inactive', // 비활성 (계획 중, 취소됨, 완료됨 등)
  ACTIVE = 'active', // 활성 (진행 중)
  // 만료 여부는 endDate와 현재 시간 비교로 판단
}
