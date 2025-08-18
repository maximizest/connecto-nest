import { Crud, CrudController } from '@foryourdev/nestjs-crud';
import {
  Controller,
  UseGuards,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Request,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Mission } from '../../mission.entity';
import { MissionService } from '../../mission.service';
import { CreateMissionDto } from '../../dto/create-mission.dto';
import { UpdateMissionDto } from '../../dto/update-mission.dto';
import { AssignMissionDto } from '../../dto/assign-mission.dto';
import { SubmitMissionDto } from '../../dto/submit-mission.dto';

/**
 * Mission API Controller (v1)
 *
 * Mission(미션) 관리 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Mission CRUD (생성/조회/수정/삭제)
 * - Mission을 Travel에 할당
 * - Mission 제출 및 평가
 * - Mission 통계 조회
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - Mission 생성/수정/삭제는 관리자 또는 Travel 호스트만 가능
 * - 일반 사용자는 할당된 Mission만 조회 및 제출 가능
 */
@Controller({ path: 'missions', version: '1' })
@Crud({
  entity: Mission,
  only: ['index', 'show', 'create', 'update', 'destroy'],
  allowedFilters: ['type', 'target', 'isActive', 'startAt', 'endAt'],
  allowedParams: [
    'title',
    'description',
    'type',
    'target',
    'metadata',
    'startAt',
    'endAt',
    'maxSubmissions',
    'allowResubmission',
  ],
  allowedIncludes: ['missionTravels', 'missionTravels.travel', 'submissions'],
  routes: {
    index: {
      allowedFilters: ['type', 'target', 'isActive', 'startAt', 'endAt'],
      allowedIncludes: ['missionTravels'],
    },
    show: {
      allowedIncludes: [
        'missionTravels',
        'missionTravels.travel',
        'submissions',
      ],
    },
  },
})
@UseGuards(AuthGuard)
export class MissionController implements CrudController<Mission> {
  constructor(public readonly crudService: MissionService) {}

  /**
   * 미션을 여행에 할당
   */
  @Post(':missionId/assign')
  async assignToTravel(
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body() assignDto: AssignMissionDto,
    @Request() req,
  ) {
    return await this.crudService.assignMissionToTravel(
      missionId,
      assignDto.travelId,
      assignDto.planetId,
      req.user.id,
    );
  }

  /**
   * 미션 제출
   */
  @Post(':missionId/submit')
  async submitMission(
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body() submitDto: SubmitMissionDto,
    @Request() req,
  ) {
    return await this.crudService.submitMission(
      req.user.id,
      missionId,
      submitDto.travelId,
      submitDto.content,
    );
  }

  /**
   * 미션 제출 평가
   */
  @Patch('submissions/:submissionId/review')
  async reviewSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() reviewDto: { approved: boolean; comment?: string },
    @Request() req,
  ) {
    return await this.crudService.reviewSubmission(
      submissionId,
      req.user.id,
      reviewDto.approved,
      reviewDto.comment,
    );
  }

  /**
   * 여행의 활성 미션 목록 조회
   */
  @Get('travel/:travelId')
  async getMissionsForTravel(
    @Param('travelId', ParseIntPipe) travelId: number,
  ) {
    return await this.crudService.getActiveMissionsForTravel(travelId);
  }

  /**
   * 사용자의 미션 제출 내역 조회
   */
  @Get('submissions/my')
  async getMySubmissions(@Request() req, @Query('travelId') travelId?: number) {
    return await this.crudService.getUserSubmissions(
      req.user.id,
      travelId ? parseInt(travelId.toString()) : undefined,
    );
  }

  /**
   * 미션 통계 조회
   */
  @Get(':missionId/statistics')
  async getMissionStatistics(
    @Param('missionId', ParseIntPipe) missionId: number,
  ) {
    return await this.crudService.getMissionStatistics(missionId);
  }

  /**
   * 미션 비활성화
   */
  @Patch(':missionId/deactivate')
  async deactivateMission(@Param('missionId', ParseIntPipe) missionId: number) {
    return await this.crudService.deactivateMission(missionId);
  }
}
