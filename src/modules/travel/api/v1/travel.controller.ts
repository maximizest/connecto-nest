import { Crud } from '@foryourdev/nestjs-crud';
import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Travel } from '../../travel.entity';
import { TravelService } from '../../travel.service';

/**
 * Travel API Controller (v1)
 *
 * Travel(여행) 조회 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Travel 목록 조회 (사용자가 참여한 Travel만)
 * - Travel 상세 조회 (멤버/Planet 목록 포함)
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - Travel 생성/수정은 관리자만 가능 (별도 API)
 * - 사용자는 초대코드로만 Travel 참여 가능
 */
@Controller({ path: 'travels', version: '1' })
@Crud({
  entity: Travel,
  only: ['index', 'show'],
  allowedFilters: ['status', 'name', 'visibility', 'endDate', 'createdAt'],
  allowedIncludes: [
    'travelUsers',
    'travelUsers.user',
    'planets',
  ],
  routes: {
    index: {
      allowedFilters: ['name', 'status', 'visibility', 'endDate', 'createdAt'],
      allowedIncludes: ['travelUsers'],
    },
    show: {
      allowedIncludes: ['travelUsers', 'travelUsers.user', 'planets'],
    },
  },
})
@UseGuards(AuthGuard)
export class TravelController {
  constructor(public readonly crudService: TravelService) {}
}