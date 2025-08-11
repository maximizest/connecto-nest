import {
  AfterCreate,
  AfterUpdate,
  BeforeCreate,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet, PlanetType } from '../../../planet/planet.entity';
import { Travel } from '../../../travel/travel.entity';
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
 * Travel 가입/탈퇴 및 멤버 관리 API를 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - Travel 가입 (초대 코드 사용, 자동 Planet 접근 권한 부여)
 * - Travel 탈퇴 (자신 탈퇴, 관리자 추방)
 * - Travel 멤버 목록 조회
 * - 멤버 권한 관리 (관리자만)
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 가입: 초대 코드 또는 공개 Travel
 * - 탈퇴: 본인 또는 관리자 권한 필요
 * - 조회: Travel 멤버만 가능
 * - 관리: 관리자 이상 권한 필요
 */
@Controller({ path: 'travel-users', version: '1' })
@Crud({
  entity: TravelUser,

  // 허용할 CRUD 액션 (탈퇴는 update로 처리)
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안)
  allowedFilters: ['travelId', 'userId', 'status', 'role', 'joinedAt'],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'travelId',
    'inviteCode', // 가입 시 초대 코드
    'role', // 관리자가 권한 변경 시
    'status', // 관리자가 상태 변경 시 (탈퇴 포함)
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
        'travelId',
        'inviteCode', // 초대 코드 또는 공개 Travel
      ],
    },

    // 수정: 관리자만 권한/상태 변경 가능 (탈퇴 포함)
    update: {
      allowedParams: [
        'role', // 권한 변경
        'status', // 상태 변경 (탈퇴, 밴, 음소거 등)
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
  ) {}

  /**
   * Travel 가입 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;

    // 사용자 정보 설정
    body.userId = user.id;
    body.joinedAt = new Date();
    body.invitedBy = user.id; // 셀프 초대로 설정 (초대 코드 사용)

    // Travel 존재 확인
    const travel = await this.travelRepository.findOne({
      where: { id: body.travelId },
    });

    if (!travel) {
      throw new NotFoundException('존재하지 않는 Travel입니다.');
    }

    if (!travel.isActive) {
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

        // 해당 Travel의 모든 GROUP Planet memberCount 증가
        await this.planetRepository
          .createQueryBuilder()
          .update(Planet)
          .set({
            memberCount: () => 'member_count + 1',
          })
          .where('travel_id = :travelId', { travelId: entity.travelId })
          .andWhere('type = :type', { type: PlanetType.GROUP })
          .andWhere('is_active = :isActive', { isActive: true })
          .execute();

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

  /**
   * Travel 멤버 수정 전 검증 (권한 변경 및 탈퇴 처리)
   */
  @BeforeUpdate()
  async beforeUpdate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;
    const travelUserId = req.params.id;

    // 기존 TravelUser 조회
    const existingTravelUser = await this.travelUserRepository.findOne({
      where: { id: travelUserId },
      relations: ['user', 'travel'],
    });

    if (!existingTravelUser) {
      throw new NotFoundException('Travel 멤버를 찾을 수 없습니다.');
    }

    // 권한 확인: 본인이거나 관리자 이상이어야 함
    const requesterMembership = await this.travelUserRepository.findOne({
      where: {
        travelId: existingTravelUser.travelId,
        userId: user.id,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('이 Travel의 멤버가 아닙니다.');
    }

    // 탈퇴 처리인지 확인
    if (body.status === TravelUserStatus.LEFT) {
      return await this.handleTravelLeave(
        body,
        user,
        existingTravelUser,
        requesterMembership,
      );
    }

    // 일반적인 수정 처리
    const canManage =
      requesterMembership.role === TravelUserRole.OWNER ||
      requesterMembership.role === TravelUserRole.ADMIN ||
      requesterMembership.userId === existingTravelUser.userId;

    if (!canManage) {
      throw new ForbiddenException('멤버 관리 권한이 없습니다.');
    }

    // 역할 변경 권한 확인
    if (body.role && body.role !== existingTravelUser.role) {
      // OWNER만 다른 사람의 권한을 변경할 수 있음
      if (requesterMembership.role !== TravelUserRole.OWNER) {
        throw new ForbiddenException('소유자만 권한을 변경할 수 있습니다.');
      }

      // OWNER 권한은 양도할 수 없음 (별도 API 필요)
      if (body.role === TravelUserRole.OWNER) {
        throw new ForbiddenException('소유자 권한은 직접 양도할 수 없습니다.');
      }
    }

    // 수정 불가능한 필드들
    delete body.userId;
    delete body.travelId;
    delete body.joinedAt;
    delete body.invitedBy;

    this.logger.log(
      `Updating travel member: id=${travelUserId}, updatedBy=${user.id}`,
    );

    return body;
  }

  /**
   * Travel 멤버 수정 후 처리 (탈퇴 시 카운트 감소 등)
   */
  @AfterUpdate()
  async afterUpdate(entity: TravelUser): Promise<TravelUser> {
    try {
      // 탈퇴 처리 후속 작업
      if (entity.status === TravelUserStatus.LEFT) {
        // Travel의 memberCount 감소
        await this.travelRepository.decrement(
          { id: entity.travelId },
          'memberCount',
          1,
        );

        // 해당 Travel의 모든 GROUP Planet memberCount 감소
        await this.planetRepository
          .createQueryBuilder()
          .update(Planet)
          .set({
            memberCount: () => 'GREATEST(member_count - 1, 0)', // 0 이하로 내려가지 않게
          })
          .where('travel_id = :travelId', { travelId: entity.travelId })
          .andWhere('type = :type', { type: PlanetType.GROUP })
          .andWhere('is_active = :isActive', { isActive: true })
          .execute();

        this.logger.log(
          `Travel left successfully: id=${entity.id}, travelId=${entity.travelId}, userId=${entity.userId}`,
        );
      } else {
        this.logger.log(`Travel member updated: id=${entity.id}`);
      }

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to process after travel update: ${error.message}`,
        error.stack,
      );

      return entity;
    }
  }

  /**
   * Travel 탈퇴 처리
   */
  private async handleTravelLeave(
    body: any,
    user: User,
    existingTravelUser: TravelUser,
    requesterMembership: TravelUser,
  ): Promise<any> {
    // 활성 멤버인지 확인
    if (existingTravelUser.status !== TravelUserStatus.ACTIVE) {
      throw new ForbiddenException('활성 멤버가 아닙니다.');
    }

    // 본인 탈퇴 또는 관리자 추방 권한 확인
    const canRemove =
      requesterMembership.userId === existingTravelUser.userId || // 본인 탈퇴
      requesterMembership.role === TravelUserRole.OWNER || // 소유자 추방
      requesterMembership.role === TravelUserRole.ADMIN; // 관리자 추방

    if (!canRemove) {
      throw new ForbiddenException('멤버 제거 권한이 없습니다.');
    }

    // 소유자는 탈퇴할 수 없음 (소유권 이전 후 탈퇴)
    if (existingTravelUser.role === TravelUserRole.OWNER) {
      throw new ForbiddenException(
        '소유자는 탈퇴할 수 없습니다. 먼저 소유권을 이전하세요.',
      );
    }

    // 탈퇴 정보 설정
    body.status = TravelUserStatus.LEFT;
    body.leftAt = new Date();

    this.logger.log(
      `Travel leaving: travelId=${existingTravelUser.travelId}, userId=${existingTravelUser.userId}, removedBy=${user.id}`,
    );

    return body;
  }
}
