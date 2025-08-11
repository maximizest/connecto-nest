import { Type } from 'class-transformer';
import {
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  IsValidFileMetadata,
  IsValidMediaDimensions,
} from '../../../common/validators/file-validation.decorator';
import { MessageType } from '../message.entity';

/**
 * 파일 메타데이터 DTO
 */
export class FileMetadataDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  fileType: string;

  @IsNumber()
  @IsPositive()
  fileSize: number; // bytes

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
  duration?: number; // 비디오/오디오 재생 시간 (초)

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number; // 이미지/비디오 너비

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number; // 이미지/비디오 높이
}

/**
 * 메시지 생성 DTO
 */
export class CreateMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsNumber()
  @IsPositive()
  planetId: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000) // 메시지 최대 길이
  content?: string;

  @IsOptional()
  @IsValidFileMetadata()
  @IsValidMediaDimensions(4096, 4096)
  @ValidateNested()
  @Type(() => FileMetadataDto)
  fileMetadata?: FileMetadataDto;

  @IsOptional()
  @IsJSON()
  systemMetadata?: any;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  replyToMessageId?: number;

  @IsOptional()
  @IsJSON()
  metadata?: any;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  searchableText?: string;
}
