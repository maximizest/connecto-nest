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
import { TravelVisibility } from '../travel.entity';

/**
 * Travel 생성 DTO
 */
export class CreateTravelDto {
  @IsString()
  @MaxLength(100)
  name: string;

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
  endDate?: string;

  @IsDateString()
  @IsValidDateOrder()
  expiryDate: string;

  @IsOptional()
  @IsEnum(TravelVisibility)
  visibility?: TravelVisibility;

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
