import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PlanetType } from '../planet.entity';

/**
 * Planet 생성 DTO
 */
export class CreatePlanetDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsEnum(PlanetType)
  type: PlanetType;

  @IsNumber()
  @IsPositive()
  travelId: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxMembers?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  partnerId?: number;

  @IsOptional()
  timeRestriction?: any;

  @IsOptional()
  settings?: any;
}
