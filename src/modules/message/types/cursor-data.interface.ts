/**
 * 커서 정보
 */
export interface CursorData {
  id: number;
  createdAt: Date;
  score?: number; // 검색 점수 (검색 시 사용)
}