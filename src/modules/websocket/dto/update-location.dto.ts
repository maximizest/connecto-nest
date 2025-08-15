import { IsNumber, IsOptional } from 'class-validator';

/**
 * 위치 업데이트 DTO
 */
export class UpdateLocationDto {
  @IsOptional()
  @IsNumber()
  travelId?: number;

  @IsOptional()
  @IsNumber()
  planetId?: number;
}