import { Crud } from '@foryourdev/nestjs-crud';
import {
  Controller,
  UseGuards,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Mission } from '../../mission.entity';
import { MissionService } from '../../mission.service';

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
  only: ['index', 'show'], // create, update, destroy routes removed
  allowedFilters: ['type', 'target', 'isActive', 'startAt', 'endAt'],
  allowedIncludes: [],
})
@UseGuards(AuthGuard)
export class MissionController {
  constructor(public readonly crudService: MissionService) {}

  /**
   * 미션 활성화/비활성화
   */
  @Patch(':missionId/status')
  async updateMissionStatus(
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body() statusDto: { isActive: boolean },
  ) {
    return await this.crudService.updateMissionStatus(
      missionId,
      statusDto.isActive,
    );
  }

  /**
   * 활성 미션 목록 조회
   */
  @Get('active')
  async getActiveMissions() {
    return await Mission.findActiveMissions();
  }
}
