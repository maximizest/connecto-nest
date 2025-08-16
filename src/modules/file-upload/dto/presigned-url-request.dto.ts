import { IsNumber, IsOptional, IsString } from 'class-validator';
import { STORAGE_SETTINGS } from '../../../config/storage.config';

/**
 * Presigned URL 요청 DTO
 */
export class PresignedUrlRequestDto {
  @IsString()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  folder?: keyof typeof STORAGE_SETTINGS.folders;

  @IsOptional()
  metadata?: Record<string, string>;
}
