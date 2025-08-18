import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType, ReportContext } from '../report.entity';

export class CreateReportDto {
  @IsNumber()
  @IsNotEmpty()
  reportedUserId: number;

  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @IsEnum(ReportContext)
  @IsNotEmpty()
  context: ReportContext;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: '신고 내용은 최소 10자 이상이어야 합니다.' })
  @MaxLength(1000, { message: '신고 내용은 최대 1000자까지 가능합니다.' })
  description: string;

  @IsNumber()
  @IsOptional()
  travelId?: number;

  @IsNumber()
  @IsOptional()
  planetId?: number;

  @IsNumber()
  @IsOptional()
  messageId?: number;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  evidenceUrls?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
