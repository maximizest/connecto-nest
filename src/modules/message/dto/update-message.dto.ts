import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { MessageStatus } from '../message.entity';

/**
 * 메시지 수정 DTO
 */
export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  @IsDateString()
  deletedAt?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  deletedBy?: number;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;

  @IsOptional()
  @IsDateString()
  editedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  originalContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  searchableText?: string;

  @IsOptional()
  @IsJSON()
  metadata?: any;
}
