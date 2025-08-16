/**
 * 업로드 결과
 */
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag?: string;
}
