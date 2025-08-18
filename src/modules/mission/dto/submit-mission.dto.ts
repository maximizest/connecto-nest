import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BalanceGameAnswerDto {
  @IsNumber()
  questionId: number;

  @IsString()
  answer: 'A' | 'B';
}

export class SubmitMissionDto {
  @IsNumber()
  travelId: number;

  @IsObject()
  content: Record<string, any>;
}

export class SubmitBalanceGameDto {
  @IsNumber()
  travelId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BalanceGameAnswerDto)
  answers: BalanceGameAnswerDto[];
}

export class SubmitMediaMissionDto {
  @IsNumber()
  travelId: number;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
