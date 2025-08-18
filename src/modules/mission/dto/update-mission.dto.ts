import { PartialType } from '@nestjs/mapped-types';
import { CreateMissionDto } from './create-mission.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateMissionDto extends PartialType(CreateMissionDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
