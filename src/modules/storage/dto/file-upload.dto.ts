import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  IsValidFileMetadata,
  IsValidMediaDimensions,
} from '../../../common/validators/file-validation.decorator';
import { FileUploadType } from '../file-upload.entity';

/**
 * 파일 업로드 시작 DTO
 */
export class InitiateFileUploadDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  fileType: string;

  @IsNumber()
  @IsPositive()
  fileSize: number; // bytes (max 500MB)

  @IsOptional()
  @IsEnum(FileUploadType)
  uploadType?: FileUploadType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  uploadFolder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  metadata?: any;
}

/**
 * 멀티파트 업로드 완료 DTO
 */
export class CompleteMultipartUploadDto {
  @IsString()
  uploadId: string;

  parts: Array<{
    ETag: string;
    PartNumber: number;
  }>;
}

/**
 * 파일 업로드 진행 상황 업데이트 DTO
 */
export class UpdateUploadProgressDto {
  @IsNumber()
  @IsPositive()
  bytesTransferred: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalBytes?: number;

  @IsOptional()
  @IsNumber()
  uploadSpeed?: number; // bytes per second

  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * 비디오 프로세싱 요청 DTO
 */
export class VideoProcessingRequestDto {
  @IsString()
  inputStorageKey: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;

  @IsOptional()
  @IsString()
  quality?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxWidth?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxHeight?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  bitrate?: number;

  @IsOptional()
  generateThumbnail?: boolean;

  @IsOptional()
  thumbnailTimeOffset?: number; // 초 단위
}

/**
 * 대용량 파일 메타데이터 검증 DTO
 */
export class LargeFileMetadataDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  fileType: string;

  @IsNumber()
  @IsPositive()
  fileSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsString()
  checksumMd5?: string;

  @IsOptional()
  @IsString()
  checksumSha256?: string;
}

// 검증된 대용량 파일 메타데이터 DTO
export class ValidatedLargeFileMetadataDto extends LargeFileMetadataDto {
  @IsValidFileMetadata()
  @IsValidMediaDimensions(4096, 4096)
  declare fileName: string;
  declare fileType: string;
  declare fileSize: number;
}
