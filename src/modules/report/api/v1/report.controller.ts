import {
  AfterCreate,
  AfterShow,
  BeforeCreate,
  BeforeDestroy,
  BeforeShow,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { getCurrentUserFromContext } from '../../../../common/helpers/current-user.helper';
import { User } from '../../../user/user.entity';
import { Report, ReportContext, ReportStatus } from '../../report.entity';
import { ReportService } from '../../report.service';
import { Planet } from '../../../planet/planet.entity';
import { Travel } from '../../../travel/travel.entity';
import { Message } from '../../../message/message.entity';
import { PlanetUser } from '../../../planet-user/planet-user.entity';
import { TravelUser } from '../../../travel-user/travel-user.entity';

/**
 * Report API Controller (v1)
 *
 * 사용자 신고 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - index: 본인이 신고한 내역만 조회 가능
 * - show: 본인이 신고한 건만 조회 가능
 * - create: 로그인한 사용자는 누구나 신고 가능
 * - update: 지원하지 않음 (신고 수정 불가)
 * - destroy: PENDING 상태의 본인 신고만 취소 가능
 */
@Controller({ path: 'reports', version: '1' })
@Crud({
  entity: Report,
  only: ['index', 'show', 'create', 'destroy'],
  allowedFilters: [
    'reporterId',
    'reportedUserId',
    'type',
    'context',
    'status',
    'travelId',
    'planetId',
    'messageId',
    'createdAt',
  ],
  allowedParams: [
    'reportedUserId',
    'type',
    'context',
    'description',
    'travelId',
    'planetId',
    'messageId',
    'evidenceUrls',
    'metadata',
  ],
  allowedIncludes: ['reportedUser', 'travel', 'planet', 'message'],
  routes: {
    index: {
      allowedIncludes: ['reportedUser', 'travel', 'planet', 'message'],
    },
    show: {
      allowedIncludes: ['reportedUser', 'travel', 'planet', 'message'],
    },
    create: {
      allowedParams: [
        'reportedUserId',
        'type',
        'context',
        'description',
        'travelId',
        'planetId',
        'messageId',
        'evidenceUrls',
        'metadata',
      ],
    },
    destroy: {
      softDelete: false, // 신고는 하드 삭제 (취소)
    },
  },
})
@UseGuards(AuthGuard)
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(public readonly crudService: ReportService) {}

  /**
   * 신고 목록 조회 (본인이 신고한 내역만)
   * index 액션을 오버라이드하여 필터 적용
   */
  @Get()
  async index(@CurrentUser() user: User, @Query() query: any): Promise<any> {
    // 본인이 신고한 내역만 조회하도록 필터 강제 설정
    query.filters = query.filters || {};
    query.filters.reporterId = user.id;

    // Active Record 패턴 사용
    const reports = await Report.find({
      where: query.filters,
      relations: query.includes || [],
      take: query.limit || 20,
      skip: query.offset || 0,
      order: { createdAt: 'DESC' },
    });

    // crudResponse 함수를 사용하여 표준 형식으로 반환
    return crudResponse(reports);
  }

  /**
   * 신고 조회 전 권한 확인 (본인이 신고한 건만)
   * nestjs-crud가 자동으로 404 처리하므로 권한만 체크
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const user = getCurrentUserFromContext(context);

    // 신고 조회 - Active Record 패턴 사용
    const report = await Report.findOne({
      where: { id: params.id },
    });

    // nestjs-crud가 404를 자동 처리하므로 report가 있는 경우만 권한 체크
    if (report && report.reporterId !== user.id) {
      throw new ForbiddenException('본인이 신고한 내역만 조회할 수 있습니다.');
    }

    return params;
  }

  /**
   * 신고 생성 전 유효성 검사
   */
  @BeforeCreate()
  async beforeCreate(params: any, context: any): Promise<any> {
    const user = getCurrentUserFromContext(context);

    // 신고자 설정
    params.data.reporterId = user.id;

    // 자기 자신 신고 방지
    if (params.data.reportedUserId === user.id) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다.');
    }

    // 신고 대상 사용자 확인 - Active Record 패턴 사용
    const reportedUser = await User.findOne({
      where: { id: params.data.reportedUserId },
    });

    if (!reportedUser) {
      throw new NotFoundException('신고 대상 사용자를 찾을 수 없습니다.');
    }

    // 컨텍스트별 유효성 검사
    await this.validateReportContext(params.data, user);

    // 중복 신고 확인
    await this.checkDuplicateReport(params.data, user.id);

    return params;
  }

  /**
   * 신고 생성 후 로깅
   */
  @AfterCreate()
  async afterCreate(
    params: any,
    context: any,
    entity: Report,
  ): Promise<Report> {
    this.logger.log(
      `Report created: id=${entity.id}, reporter=${entity.reporterId}, reported=${entity.reportedUserId}, type=${entity.type}`,
    );

    return entity;
  }

  /**
   * 신고 조회 후 민감 정보 제거
   */
  @AfterShow()
  async afterShow(params: any, context: any, entity: Report): Promise<Report> {
    // adminNotes와 reviewer 정보는 이미 @Exclude()로 처리됨
    return entity;
  }

  /**
   * 신고 삭제(취소) 전 권한 확인
   * nestjs-crud가 자동으로 404 처리하므로 권한과 상태만 체크
   */
  @BeforeDestroy()
  async beforeDestroy(params: any, context: any): Promise<any> {
    const user = getCurrentUserFromContext(context);

    // 신고 조회 - Active Record 패턴 사용
    const report = await Report.findOne({
      where: { id: params.id },
    });

    // nestjs-crud가 404를 자동 처리하므로 report가 있는 경우만 체크
    if (report) {
      // 본인이 신고한 건만 취소 가능
      if (report.reporterId !== user.id) {
        throw new ForbiddenException(
          '본인이 신고한 내역만 취소할 수 있습니다.',
        );
      }

      // PENDING 상태만 취소 가능
      if (report.status !== ReportStatus.PENDING) {
        throw new BadRequestException(
          '검토 대기 중인 신고만 취소할 수 있습니다.',
        );
      }
    }

    return params;
  }

  /**
   * 컨텍스트별 유효성 검사
   */
  private async validateReportContext(data: any, user: User): Promise<void> {
    switch (data.context) {
      case ReportContext.TRAVEL:
        if (!data.travelId) {
          throw new BadRequestException('Travel 신고는 travelId가 필요합니다.');
        }

        // Travel 존재 여부 및 참여 여부 확인 - Active Record 패턴 사용
        const travel = await Travel.findOne({
          where: { id: data.travelId },
        });

        if (!travel) {
          throw new NotFoundException('Travel을 찾을 수 없습니다.');
        }

        const travelUser = await TravelUser.findOne({
          where: { userId: user.id, travelId: data.travelId },
        });

        if (!travelUser) {
          throw new ForbiddenException(
            '참여하지 않은 Travel의 사용자는 신고할 수 없습니다.',
          );
        }
        break;

      case ReportContext.PLANET:
        if (!data.planetId) {
          throw new BadRequestException('Planet 신고는 planetId가 필요합니다.');
        }

        // Planet 존재 여부 및 참여 여부 확인 - Active Record 패턴 사용
        const planet = await Planet.findOne({
          where: { id: data.planetId },
        });

        if (!planet) {
          throw new NotFoundException('Planet을 찾을 수 없습니다.');
        }

        const planetUser = await PlanetUser.findOne({
          where: { userId: user.id, planetId: data.planetId },
        });

        if (!planetUser) {
          throw new ForbiddenException(
            '참여하지 않은 Planet의 사용자는 신고할 수 없습니다.',
          );
        }
        break;

      case ReportContext.MESSAGE:
        if (!data.messageId) {
          throw new BadRequestException(
            '메시지 신고는 messageId가 필요합니다.',
          );
        }

        // 메시지 존재 여부 확인 - Active Record 패턴 사용
        const message = await Message.findOne({
          where: { id: data.messageId },
          relations: ['planet'],
        });

        if (!message) {
          throw new NotFoundException('메시지를 찾을 수 없습니다.');
        }

        // 메시지가 속한 Planet 참여 여부 확인 - Active Record 패턴 사용
        const messagePlanetUser = await PlanetUser.findOne({
          where: { userId: user.id, planetId: message.planet.id },
        });

        if (!messagePlanetUser) {
          throw new ForbiddenException('해당 메시지에 접근할 수 없습니다.');
        }

        // planetId 자동 설정
        data.planetId = message.planet.id;
        break;

      case ReportContext.USER_PROFILE:
        // 프로필 신고는 특별한 컨텍스트 필요 없음
        break;

      default:
        throw new BadRequestException('유효하지 않은 신고 컨텍스트입니다.');
    }
  }

  /**
   * 중복 신고 확인
   */
  private async checkDuplicateReport(
    data: any,
    reporterId: number,
  ): Promise<void> {
    const existingReports = await Report.find({
      where: {
        reporterId,
        reportedUserId: data.reportedUserId,
        status: ReportStatus.PENDING,
      },
    });

    const contextId = data.travelId || data.planetId || data.messageId;

    if (
      Report.isDuplicate(
        existingReports,
        reporterId,
        data.reportedUserId,
        data.context,
        contextId,
      )
    ) {
      throw new BadRequestException(
        '이미 신고한 내용입니다. 처리 중이니 기다려주세요.',
      );
    }
  }
}
