import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import {
  IsValidDateOrder,
  IsValidTravelSettings,
} from '../../../common/validators/business-validation.decorator';
import { TravelStatus, TravelVisibility } from '../travel.entity';

/**
 * Travel 수정 DTO
 */
export class UpdateTravelDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsValidDateOrder()
  endDate?: string;

  @IsOptional()
  @IsEnum(TravelVisibility)
  visibility?: TravelVisibility;

  @IsOptional()
  @IsEnum(TravelStatus)
  status?: TravelStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxPlanets?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxGroupMembers?: number;

  @IsOptional()
  @IsBoolean()
  inviteCodeEnabled?: boolean;

  @IsOptional()
  @IsValidTravelSettings()
  settings?: any;
}
