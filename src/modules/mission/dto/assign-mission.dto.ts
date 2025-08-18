import { IsNumber, IsOptional } from 'class-validator';

export class AssignMissionDto {
  @IsNumber()
  travelId: number;

  @IsOptional()
  @IsNumber()
  planetId?: number;
}
