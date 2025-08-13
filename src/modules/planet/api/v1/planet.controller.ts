import { Crud } from '@foryourdev/nestjs-crud';
import { Controller, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet } from '../../planet.entity';
import { PlanetService } from '../../planet.service';

/**
 * Planet API Controller (v1)
 *
 * Planet(채팅방) 조회 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Planet 목록 조회 (사용자가 참여한 Planet만)
 * - Planet 상세 조회 (메시지, 멤버 정보 포함)
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - Planet 생성/수정은 관리자만 가능 (별도 API)
 * - 사용자는 참여한 Planet만 조회 가능
 */
@Controller({ path: 'planets', version: '1' })
@Crud({
  entity: Planet,

  // 허용할 CRUD 액션 (사용자는 조회만 가능, 생성/수정은 관리자만)
  only: ['index', 'show'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['travelId', 'type', 'isActive', 'name', 'createdAt'],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'travel',
    'messages',
    'directMembers', // PlanetUser (1:1 Planet용)
    'directMembers.user',
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Travel 범위로 제한
    index: {
      allowedFilters: [
        'travelId', // 필수 필터 (사용자 속한 Travel만)
        'type',
        'isActive',
        'name',
        'createdAt',
      ],
      allowedIncludes: ['travel'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['travel', 'directMembers', 'directMembers.user'],
    },
  },
})
@UseGuards(AuthGuard)
export class PlanetController {
  constructor(public readonly crudService: PlanetService) {}
}
