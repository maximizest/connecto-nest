/**
 * 파일 메타데이터 인터페이스
 */
export interface FileMetadata {
  originalName: string; // 원본 파일명
  fileName: string; // 저장된 파일명
  fileSize: number; // 파일 크기 (bytes)
  mimeType: string; // MIME 타입
  extension: string; // 파일 확장자
  storageKey: string; // 스토리지 키
  url: string; // 접근 URL
  thumbnailUrl?: string; // 썸네일 URL (이미지/비디오)
  width?: number; // 이미지/비디오 너비
  height?: number; // 이미지/비디오 높이
  duration?: number; // 비디오 재생 시간 (초)
  checksum?: string; // 파일 체크섬
}
