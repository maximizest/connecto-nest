import {
  AfterCreate,
  BeforeCreate,
  BeforeShow,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { PlanetUser } from '../../../planet-user/planet-user.entity';
import { PlanetUserStatus } from '../../../planet-user/enums/planet-user-status.enum';
import { Planet } from '../../../planet/planet.entity';
import { PlanetType } from '../../../planet/enums/planet-type.enum';
import { PlanetStatus } from '../../../planet/enums/planet-status.enum';
import { Travel } from '../../../travel/travel.entity';
import { TravelStatus } from '../../../travel/enums/travel-status.enum';
import { User } from '../../../user/user.entity';
import { TravelUser } from '../../travel-user.entity';
import { TravelUserRole } from '../../enums/travel-user-role.enum';
import { TravelUserStatus } from '../../enums/travel-user-status.enum';
import { TravelUserService } from '../../travel-user.service';

/**
 * TravelUser API Controller (v1)
 *
 * Travel 가입 및 멤버 조회 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Travel 가입 (초대 코드 필수, 자동 단체 Planet 접근 권한 부여)
 * - Travel 멤버 목록 조회
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 가입: 초대 코드 필수, 현재 로그인한 유저 자동 설정, 중복 참여 시 오류
 * - 조회: 여행에 참여한 유저만 가능 (travelId 필터 필수)
 * - 수정: 본인의 멤버십 정보만 수정 가능
 * - 탈퇴: 사용자는 직접 탈퇴할 수 없음 (관리자 전용)
 *
 * 자동 기능:
 * - Travel 가입 시 해당 Travel의 모든 단체 Planet에 자동 참여
 * - 1:1 Planet은 관리자가 매칭하여 자동 생성/참여
 */
@Controller({ path: 'travel-users', version: '1' })
@Crud({
  entity: TravelUser,

  // 허용할 CRUD 액션 (읽기, 가입, 수정만 가능 - 삭제 불가)
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['travelId', 'userId', 'status', 'role', 'joinedAt'],

  // Body에서 허용할 파라미터 (가입/수정 시)
  allowedParams: [
    'inviteCode', // Travel 참여용 초대코드 (필수)
    'bio', // 멤버 소개
    'nickname', // 멤버 닉네임
  ],

  // 관계 포함 허용 필드
  allowedIncludes: ['user', 'travel'],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Travel 범위로 제한 (travelId 필터 필수)
    // 클라이언트는 반드시 ?filter[travelId_eq]=123 형태로 요청해야 함
    // 해당 여행에 참여한 유저만 조회 가능 (서비스 레벨에서 권한 확인)
    index: {
      allowedFilters: [
        'travelId', // 필수 필터 - 반드시 포함되어야 함
        'status',
        'role',
        'joinedAt',
      ],
      allowedIncludes: ['user'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['user', 'travel'],
    },

    // 가입: 초대 코드 필수
    create: {
      allowedParams: [
        'inviteCode', // 초대 코드로만 참여 가능
      ],
    },

    // 수정: 본인 정보만 수정 가능
    update: {
      allowedParams: ['bio', 'nickname'],
    },
  },
})
@UseGuards(AuthGuard)
export class TravelUserController {
  private readonly logger = new Logger(TravelUserController.name);

  constructor(public readonly crudService: TravelUserService) {}

  /**
   * 멤버십 조회 전 권한 확인 (여행에 참여한 유저만 조회 가능)
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    const targetTravelUserId = parseInt(params.id, 10);

    // 조회하려는 TravelUser 정보 가져오기
    const targetTravelUser = await TravelUser.findOne({
      where: { id: targetTravelUserId },
    });

    if (!targetTravelUser) {
      throw new NotFoundException('여행 멤버십을 찾을 수 없습니다.');
    }

    // 현재 유저가 해당 여행에 참여했는지 확인
    const currentUserTravelMembership = await TravelUser.findOne({
      where: {
        travelId: targetTravelUser.travelId,
        userId: user.id,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!currentUserTravelMembership) {
      throw new ForbiddenException(
        '여행에 참여한 유저만 멤버십 정보를 조회할 수 있습니다.',
      );
    }

    return params;
  }

  /**
   * 멤버십 수정 전 권한 확인 (본인의 정보만 수정 가능)
   */
  @BeforeUpdate()
  async beforeUpdate(
    entity: TravelUser,
    body: any,
    context: any,
  ): Promise<any> {
    const user: User = context.request?.user;

    // 본인의 멤버십만 수정 가능
    if (entity.userId !== user.id) {
      throw new ForbiddenException('본인의 멤버십 정보만 수정할 수 있습니다.');
    }

    // 중요한 필드는 수정 불가 (role, status 등)
    delete body.userId;
    delete body.travelId;
    delete body.role;
    delete body.status;
    delete body.joinedAt;

    return body;
  }

  /**
   * Travel 가입 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // 초대코드 필수 확인
    if (!body.inviteCode) {
      throw new ForbiddenException(
        'Travel 참여를 위해서는 초대코드가 필요합니다.',
      );
    }

    // 초대코드로 Travel 찾기
    const travel = await Travel.findOne({
      where: {
        inviteCode: body.inviteCode,
      },
    });

    if (!travel) {
      throw new NotFoundException('유효하지 않은 초대코드입니다.');
    }

    // 사용자 정보 설정
    body.userId = user.id;
    body.travelId = travel.id; // 초대코드로 찾은 Travel ID 설정
    body.joinedAt = new Date();

    if (travel.status !== TravelStatus.ACTIVE) {
      throw new ForbiddenException('비활성화된 Travel입니다.');
    }

    if (travel.isExpired()) {
      throw new ForbiddenException('만료된 Travel입니다.');
    }

    // 이미 가입된 멤버인지 확인
    const existingMember = await TravelUser.findOne({
      where: {
        travelId: body.travelId,
        userId: user.id,
      },
    });

    if (existingMember) {
      if (existingMember.status === TravelUserStatus.ACTIVE) {
        throw new ForbiddenException(
          '이미 해당 여행에 참여하고 있습니다. 중복 참여는 불가능합니다.',
        );
      } else if (existingMember.status === TravelUserStatus.BANNED) {
        throw new ForbiddenException(
          '이 여행에서 차단된 사용자입니다. 참여할 수 없습니다.',
        );
      }
    }

    // 가입 방식 확인
    if (travel.visibility === 'public') {
      // 공개 Travel: 누구나 가입 가능
      body.status = TravelUserStatus.ACTIVE;
      body.role = TravelUserRole.PARTICIPANT;
    } else {
      // 비공개 Travel: 초대 코드 필요
      if (!body.inviteCode) {
        throw new ForbiddenException('초대 코드가 필요합니다.');
      }

      if (body.inviteCode !== travel.inviteCode) {
        throw new ForbiddenException('올바르지 않은 초대 코드입니다.');
      }

      // 초대 코드가 있으면 활성 상태로 설정
      body.status = TravelUserStatus.ACTIVE;
      body.role = TravelUserRole.PARTICIPANT;
    }

    // 최대 멤버 수 확인
    const currentMemberCount = await TravelUser.count({
      where: {
        travelId: body.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    // 기본 최대 멤버 수 (100명)
    const maxMembers = 100;
    if (currentMemberCount >= maxMembers) {
      throw new ForbiddenException(
        `Travel의 최대 멤버 수(${maxMembers}명)에 도달했습니다.`,
      );
    }

    this.logger.log(
      `Travel joining: travelId=${body.travelId}, userId=${user.id}, status=${body.status}`,
    );

    return body;
  }

  /**
   * Travel 가입 후 처리 (Planet 접근 권한 자동 부여)
   */
  @AfterCreate()
  async afterCreate(entity: TravelUser): Promise<TravelUser> {
    try {
      // 활성 가입인 경우에만 후속 처리
      if (entity.status === TravelUserStatus.ACTIVE) {
        // Note: memberCount field does not exist in Travel entity
        // TODO: Add memberCount field to Travel entity if member count tracking is needed

        // 해당 Travel의 모든 GROUP Planet에 자동 참여 처리
        const groupPlanets = await Planet.find({
          where: {
            travelId: entity.travelId,
            type: PlanetType.GROUP,
            status: PlanetStatus.ACTIVE,
          },
        });

        for (const planet of groupPlanets) {
          // 각 그룹 Planet에 사용자 추가
          const planetUser = PlanetUser.create({
            planetId: planet.id,
            userId: entity.userId,
            status: PlanetUserStatus.ACTIVE,
            joinedAt: new Date(),
          });

          await planetUser.save();

          // Note: memberCount field does not exist in Planet entity
          // TODO: Add memberCount field to Planet entity if member count tracking is needed

          this.logger.log(
            `User auto-joined group planet: userId=${entity.userId}, planetId=${planet.id}`,
          );
        }

        this.logger.log(
          `Travel joined successfully: id=${entity.id}, travelId=${entity.travelId}, userId=${entity.userId}`,
        );
      } else {
        this.logger.log(
          `Travel join pending approval: id=${entity.id}, travelId=${entity.travelId}`,
        );
      }

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to process after travel join: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }
}
