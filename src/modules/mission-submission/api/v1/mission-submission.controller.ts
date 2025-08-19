import { Controller, UseGuards } from '@nestjs/common';
import { Crud } from '@foryourdev/nestjs-crud';
import { MissionSubmission } from '../../mission-submission.entity';
import { MissionSubmissionService } from '../../mission-submission.service';
import { AuthGuard } from '../../../../guards/auth.guard';

@Controller({ path: 'mission-submissions', version: '1' })
@UseGuards(AuthGuard)
@Crud({
  entity: MissionSubmission,
  allowedFilters: ['userId', 'missionId', 'travelId', 'status', 'submittedAt'],
  allowedParams: ['userId', 'missionId', 'travelId'],
  allowedIncludes: ['user', 'mission', 'travel'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
export class MissionSubmissionController {
  constructor(public readonly crudService: MissionSubmissionService) {}
}
