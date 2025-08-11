import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import {
  IsValidMemberLimit,
  IsValidTimeRestriction,
} from '../../../common/validators/business-validation.decorator';
import { PlanetStatus, PlanetType } from '../planet.entity';

/**
 * Planet 수정 DTO
 */
export class UpdatePlanetDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(PlanetType)
  type?: PlanetType;

  @IsOptional()
  @IsEnum(PlanetStatus)
  status?: PlanetStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @IsValidMemberLimit()
  maxMembers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsValidTimeRestriction()
  timeRestriction?: any;

  @IsOptional()
  settings?: any;
}
