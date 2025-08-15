import { BeforeShow, Crud } from '@foryourdev/nestjs-crud';
import { 
  Controller, 
  ForbiddenException, 
  NotFoundException,
  UseGuards 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet } from '../../planet.entity';
import { PlanetService } from '../../planet.service';
import { TravelUser, TravelUserStatus } from '../../../travel-user/travel-user.entity';
import { User } from '../../../user/user.entity';

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
 * - 여행 아이디를 필수로 받아야 함 (travelId 필터 필수)
 * - 본인이 참여한 여행 하위 행성만 조회 가능
 * - 사용자는 행성을 삭제할 수 없음
 */
@Controller({ path: 'planets', version: '1' })
@Crud({
  entity: Planet,

  // 허용할 CRUD 액션 (사용자는 조회만 가능, 삭제 불가)
  only: ['index', 'show'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['travelId', 'type', 'isActive', 'name', 'createdAt'],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'travel',
    'partner', // Direct Planet의 상대방
    'planetUsers',
    'planetUsers.user',
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Travel 범위로 제한 (travelId 필터 필수)
    // 클라이언트는 반드시 ?filter[travelId_eq]=123 형태로 요청해야 함
    // 해당 여행에 참여한 유저만 조회 가능 (서비스 레벨에서 권한 확인)
    index: {
      allowedFilters: [
        'travelId', // 필수 필터 - 반드시 포함되어야 함
        'type',
        'isActive',
        'name',
        'createdAt',
      ],
      allowedIncludes: ['travel'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['travel', 'partner', 'planetUsers', 'planetUsers.user'],
    },
  },
})
@UseGuards(AuthGuard)
export class PlanetController {
  constructor(
    public readonly crudService: PlanetService,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
  ) {}

  /**
   * Planet 조회 전 권한 확인 (본인이 참여한 여행 하위 행성만 조회 가능)
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    const planetId = parseInt(params.id, 10);

    // 조회하려는 Planet 정보 가져오기
    const planet = await this.planetRepository.findOne({
      where: { id: planetId },
      relations: ['travel'],
    });

    if (!planet) {
      throw new NotFoundException('행성을 찾을 수 없습니다.');
    }

    // 현재 유저가 해당 여행에 참여했는지 확인
    const userTravelMembership = await this.travelUserRepository.findOne({
      where: {
        travelId: planet.travelId,
        userId: user.id,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!userTravelMembership) {
      throw new ForbiddenException('본인이 참여한 여행의 행성만 조회할 수 있습니다.');
    }

    return params;
  }
}
