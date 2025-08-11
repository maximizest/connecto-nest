import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanetDto } from './create-planet.dto';

/**
 * Planet 업데이트 DTO
 */
export class UpdatePlanetDto extends PartialType(CreatePlanetDto) {}
