import { Crud } from '@foryourdev/nestjs-crud';
import { Controller, Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { PlanetUser } from '../../planet-user.entity';
import { PlanetUserService } from '../../planet-user.service';

/**
 * PlanetUser API Controller (v1)
 *
 * Planet 멤버십 조회 전용 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Planet 멤버십 조회 (읽기 전용)
 * - 본인이 참여 중인 Planet 목록 확인
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 조회만 가능: 본인의 멤버십만 조회 가능
 * - 생성/수정/삭제: 관리자 전용 (별도 Admin API에서 구현)
 *
 * 참고:
 * - 단체 Planet: Travel 참여 시 자동 참여됨
 * - 1:1 Planet: 관리자가 매칭하여 자동 참여됨
 * - 초대/수락/거절/나가기 기능 없음 (모든 Planet 관리는 관리자가 담당)
 */
@Controller({ path: 'planet-users', version: '1' })
@Crud({
  entity: PlanetUser,

  // 허용할 CRUD 액션 (읽기 전용)
  only: ['index', 'show'],

  // 필터링 허용 필드 (조회용)
  allowedFilters: ['planetId', 'status', 'role', 'joinedAt'],

  // 관계 포함 허용 필드
  allowedIncludes: ['user', 'planet'],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: 본인의 멤버십만 조회
    index: {
      allowedFilters: ['planetId', 'status', 'role', 'joinedAt'],
      allowedIncludes: ['user', 'planet'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['user', 'planet'],
    },
  },
})
@UseGuards(AuthGuard)
export class PlanetUserController {
  private readonly logger = new Logger(PlanetUserController.name);

  constructor(public readonly crudService: PlanetUserService) {}
}
