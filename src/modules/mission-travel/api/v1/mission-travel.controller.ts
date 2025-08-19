import { Controller, UseGuards } from '@nestjs/common';
import { Crud } from '@foryourdev/nestjs-crud';
import { MissionTravel } from '../../mission-travel.entity';
import { MissionTravelService } from '../../mission-travel.service';
import { AuthGuard } from '../../../../guards/auth.guard';

@Controller({ path: 'mission-travels', version: '1' })
@UseGuards(AuthGuard)
@Crud({
  entity: MissionTravel,
  allowedFilters: ['missionId', 'travelId', 'planetId', 'assignedAt'],
  allowedIncludes: ['mission', 'travel', 'planet'],
  only: ['index', 'show'], // create, destroy routes removed
})
export class MissionTravelController {
  constructor(public readonly crudService: MissionTravelService) {}
}
