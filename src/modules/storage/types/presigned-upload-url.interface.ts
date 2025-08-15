/**
 * Presigned Upload URL
 */
export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: Date;
}