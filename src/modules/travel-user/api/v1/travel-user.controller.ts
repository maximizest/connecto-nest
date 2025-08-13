import { AfterCreate, BeforeCreate, Crud } from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  PlanetUser,
  PlanetUserRole,
  PlanetUserStatus,
} from '../../../planet-user/planet-user.entity';
import { Planet, PlanetType } from '../../../planet/planet.entity';
import { Travel, TravelStatus } from '../../../travel/travel.entity';
import { User } from '../../../user/user.entity';
import {
  TravelUser,
  TravelUserRole,
  TravelUserStatus,
} from '../../travel-user.entity';
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
 * - 가입: 초대 코드 필수 (관리자가 Travel 생성 시 제공)
 * - 조회: Travel 멤버만 가능
 * - 탈퇴/추방/권한관리: 관리자 전용 (별도 Admin API에서 구현)
 *
 * 자동 기능:
 * - Travel 가입 시 해당 Travel의 모든 단체 Planet에 자동 참여
 * - 1:1 Planet은 관리자가 매칭하여 자동 생성/참여
 */
@Controller({ path: 'travel-users', version: '1' })
@Crud({
  entity: TravelUser,

  // 허용할 CRUD 액션 (읽기 및 가입만 가능)
  only: ['index', 'show', 'create'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['travelId', 'userId', 'status', 'role', 'joinedAt'],

  // Body에서 허용할 파라미터 (가입 시)
  allowedParams: [
    'inviteCode', // Travel 참여용 초대코드 (필수)
  ],

  // 관계 포함 허용 필드
  allowedIncludes: [
    'user',
    'travel',
    'inviter', // 초대한 사용자
  ],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Travel 범위로 제한
    index: {
      allowedFilters: [
        'travelId', // 필수 필터
        'status',
        'role',
        'joinedAt',
      ],
      allowedIncludes: ['user', 'inviter'],
    },

    // 단일 조회: 상세 정보 포함
    show: {
      allowedIncludes: ['user', 'travel', 'inviter'],
    },

    // 가입: 초대 코드 필수
    create: {
      allowedParams: [
        'inviteCode', // 초대 코드로만 참여 가능
      ],
    },
  },
})
@UseGuards(AuthGuard)
export class TravelUserController {
  private readonly logger = new Logger(TravelUserController.name);

  constructor(
    public readonly crudService: TravelUserService,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {}

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
    const travel = await this.travelRepository.findOne({
      where: {
        inviteCode: body.inviteCode,
        inviteCodeEnabled: true,
      },
    });

    if (!travel) {
      throw new NotFoundException('유효하지 않은 초대코드입니다.');
    }

    // 사용자 정보 설정
    body.userId = user.id;
    body.travelId = travel.id; // 초대코드로 찾은 Travel ID 설정
    body.joinedAt = new Date();
    body.invitedBy = user.id; // 셀프 초대로 설정 (초대 코드 사용)

    if (travel.status !== TravelStatus.ACTIVE) {
      throw new ForbiddenException('비활성화된 Travel입니다.');
    }

    if (travel.isExpired()) {
      throw new ForbiddenException('만료된 Travel입니다.');
    }

    // 이미 가입된 멤버인지 확인
    const existingMember = await this.travelUserRepository.findOne({
      where: {
        travelId: body.travelId,
        userId: user.id,
      },
    });

    if (existingMember) {
      if (existingMember.status === TravelUserStatus.ACTIVE) {
        throw new ForbiddenException('이미 가입된 Travel입니다.');
      } else if (existingMember.status === TravelUserStatus.BANNED) {
        throw new ForbiddenException('이 Travel에서 차단된 사용자입니다.');
      } else if (existingMember.status === TravelUserStatus.LEFT) {
        // 기존 탈퇴 기록을 재활성화
        body.status = TravelUserStatus.ACTIVE;
        body.role = TravelUserRole.MEMBER;
        body.joinedAt = new Date();

        await this.travelUserRepository.update(existingMember.id, body);

        this.logger.log(
          `Travel rejoined: travelId=${body.travelId}, userId=${user.id}`,
        );

        return body;
      }
    }

    // 가입 방식 확인
    if (travel.visibility === 'public') {
      // 공개 Travel: 누구나 가입 가능
      body.status = TravelUserStatus.ACTIVE;
      body.role = TravelUserRole.MEMBER;
    } else {
      // 비공개 Travel: 초대 코드 필요
      if (!body.inviteCode) {
        throw new ForbiddenException('초대 코드가 필요합니다.');
      }

      if (body.inviteCode !== travel.inviteCode) {
        throw new ForbiddenException('올바르지 않은 초대 코드입니다.');
      }

      if (!travel.inviteCodeEnabled) {
        throw new ForbiddenException('초대 코드가 비활성화되었습니다.');
      }

      body.status = travel.settings?.requireApproval
        ? TravelUserStatus.PENDING
        : TravelUserStatus.ACTIVE;
      body.role = TravelUserRole.MEMBER;
    }

    // 최대 멤버 수 확인
    const currentMemberCount = await this.travelUserRepository.count({
      where: {
        travelId: body.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    const maxMembers = travel.maxGroupMembers || 50;
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
        // Travel의 memberCount 증가
        await this.travelRepository.increment(
          { id: entity.travelId },
          'memberCount',
          1,
        );

        // 해당 Travel의 모든 GROUP Planet에 자동 참여 처리
        const groupPlanets = await this.planetRepository.find({
          where: {
            travelId: entity.travelId,
            type: PlanetType.GROUP,
            isActive: true,
          },
        });

        for (const planet of groupPlanets) {
          // 각 그룹 Planet에 사용자 추가
          const planetUser = this.planetUserRepository.create({
            planetId: planet.id,
            userId: entity.userId,
            status: PlanetUserStatus.ACTIVE,
            role: PlanetUserRole.PARTICIPANT,
            joinedAt: new Date(),
            invitedBy: entity.invitedBy || entity.userId,
          });

          await this.planetUserRepository.save(planetUser);

          // Planet의 memberCount 증가
          await this.planetRepository.increment(
            { id: planet.id },
            'memberCount',
            1,
          );

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
