import {
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MissionType } from '../enums/mission-type.enum';
import { MissionTarget } from '../enums/mission-target.enum';

class BalanceGameQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  optionA: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  optionB: string;

  @IsNumber()
  order: number;
}

export class CreateMissionDto {
  @IsEnum(MissionType)
  type: MissionType;

  @IsEnum(MissionTarget)
  target: MissionTarget;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsDateString()
  startAt: Date;

  @IsDateString()
  endAt: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  maxSubmissions?: number;

  @IsOptional()
  @IsBoolean()
  allowResubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBalanceGameMissionDto extends CreateMissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BalanceGameQuestionDto)
  questions: BalanceGameQuestionDto[];
}
