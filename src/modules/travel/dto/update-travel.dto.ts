import { PartialType } from '@nestjs/mapped-types';
import { CreateTravelDto } from './create-travel.dto';

/**
 * Travel 업데이트 DTO
 */
export class UpdateTravelDto extends PartialType(CreateTravelDto) {}
