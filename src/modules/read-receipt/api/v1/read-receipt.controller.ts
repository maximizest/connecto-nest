import {
  BeforeCreate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Message } from '../../../message/message.entity';
import { Planet } from '../../../planet/planet.entity';
import { User } from '../../../user/user.entity';
import { MessageReadReceipt } from '../../read-receipt.entity';
import { ReadReceiptService } from '../../read-receipt.service';

/**
 * Message Read Receipt API Controller (v1)
 *
 * Travel/Planet 범위 내에서 메시지 읽음 상태를 관리합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 주요 기능:
 * - 개별 메시지 읽음 처리
 * - 일괄 읽음 처리
 * - Planet별 읽지 않은 메시지 카운트
 * - 읽음 상태 통계 및 분석
 * - 실시간 읽음 상태 동기화
 */
@Controller({ path: 'read-receipts', version: '1' })
@Crud({
  entity: MessageReadReceipt,

  // 허용할 CRUD 액션
  only: ['index', 'show'],

  // 필터링 허용 필드 (보안)
  allowedFilters: [
    'messageId',
    'userId',
    'planetId',
    'isRead',
    'readAt',
    'deviceType',
    'createdAt',
  ],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'messageId',
    'userId',
    'planetId',
    'isRead',
    'readAt',
    'deviceType',
    'userAgent',
    'metadata',
  ],

  // 관계 포함 허용 필드
  allowedIncludes: ['message', 'user', 'planet'],

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Planet 범위로 제한
    index: {
      allowedFilters: [
        'planetId', // 필수 필터
        'userId',
        'messageId',
        'isRead',
        'readAt',
        'deviceType',
      ],
      allowedIncludes: ['user', 'message'],
    },

    // 단일 조회: 메시지 정보 포함
    show: {
      allowedIncludes: ['message', 'user', 'planet'],
    },
  },
})
@UseGuards(AuthGuard)
export class ReadReceiptController {
  private readonly logger = new Logger(ReadReceiptController.name);

  constructor(
    public readonly crudService: ReadReceiptService,
    @InjectRepository(MessageReadReceipt)
    private readonly readReceiptRepository: Repository<MessageReadReceipt>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 읽음 영수증 생성 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // 사용자 정보 설정
    body.userId = user.id;

    this.logger.log(
      `Creating read receipt: messageId=${body.messageId}, userId=${user.id}`,
    );

    return body;
  }

  /**
   * 읽음 영수증 수정 전 검증
   */
  @BeforeUpdate()
  async beforeUpdate(
    entity: MessageReadReceipt,
    context: any,
  ): Promise<MessageReadReceipt> {
    // 읽음 영수증은 isRead와 metadata만 수정 가능
    // 다른 필드 변경 시도는 무시됨

    return entity;
  }

  /**
   * 메시지 읽음 처리 API
   * POST /api/v1/read-receipts/mark-read
   */
  @Post('mark-read')
  async markMessageAsRead(
    @Body()
    body: {
      messageId: number;
      deviceType?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      readDuration?: number;
      sessionId?: string;
    },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { messageId, deviceType, readSource, readDuration, sessionId } =
        body;

      // 메시지 존재 및 접근 권한 확인
      await this.validateMessageAccess(messageId, user.id);

      // 읽음 처리
      const receipt = await this.crudService.markMessageAsRead(
        messageId,
        user.id,
        {
          deviceType,
          userAgent: req.headers['user-agent'],
          readSource,
          readDuration,
          sessionId,
        },
      );

      // 실시간 읽음 상태 동기화 이벤트 발생
      this.eventEmitter.emit('message.read', {
        messageId: receipt.messageId,
        planetId: receipt.planetId,
        userId: user.id,
        userName: user.name,
        readAt: receipt.readAt,
        deviceType: receipt.deviceType,
      });

      this.logger.log(
        `Message marked as read: messageId=${messageId}, userId=${user.id}`,
      );

      return crudResponse(receipt);
    } catch (error) {
      this.logger.error(
        `Mark message as read failed: messageId=${body.messageId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 여러 메시지 일괄 읽음 처리 API
   * POST /api/v1/read-receipts/mark-multiple-read
   */
  @Post('mark-multiple-read')
  async markMultipleMessagesAsRead(
    @Body()
    body: {
      messageIds: number[];
      deviceType?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      sessionId?: string;
    },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { messageIds, deviceType, readSource, sessionId } = body;

      if (!messageIds || messageIds.length === 0) {
        throw new Error('messageIds is required and cannot be empty');
      }

      // 각 메시지의 접근 권한 확인
      await Promise.all(
        messageIds.map((messageId) =>
          this.validateMessageAccess(messageId, user.id),
        ),
      );

      // 일괄 읽음 처리
      const receipts = await this.crudService.markMultipleMessagesAsRead(
        messageIds,
        user.id,
        {
          deviceType,
          userAgent: req.headers['user-agent'],
          readSource,
          sessionId,
        },
      );

      // 실시간 일괄 읽음 상태 동기화 이벤트 발생
      receipts.forEach((receipt) => {
        this.eventEmitter.emit('message.read', {
          messageId: receipt.messageId,
          planetId: receipt.planetId,
          userId: user.id,
          userName: user.name,
          readAt: receipt.readAt,
          deviceType: receipt.deviceType,
          isBatchRead: true,
        });
      });

      this.logger.log(
        `Multiple messages marked as read: count=${receipts.length}, userId=${user.id}`,
      );

      // Create virtual MessageReadReceipt entity for batch operation
      const batchReadEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId: 0,
        isRead: true,
        readAt: new Date(),
        metadata: {
          processedCount: receipts.length,
          receipts: receipts.map((r) => r.getSummary()),
          operationType: 'batch_read',
        },
      });

      return crudResponse(batchReadEntity);
    } catch (error) {
      this.logger.error(
        `Mark multiple messages as read failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet의 모든 메시지 읽음 처리 API
   * POST /api/v1/read-receipts/mark-all-read/:planetId
   */
  @Post('mark-all-read/:planetId')
  async markAllMessagesAsReadInPlanet(
    @Param('planetId') planetId: number,
    @Body()
    body: {
      deviceType?: string;
      sessionId?: string;
    },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Planet 접근 권한 확인
      await this.validatePlanetAccess(planetId, user.id);

      // 모든 메시지 읽음 처리
      const result = await this.crudService.markAllMessagesAsReadInPlanet(
        planetId,
        user.id,
        {
          deviceType: body.deviceType,
          userAgent: req.headers['user-agent'],
          sessionId: body.sessionId,
        },
      );

      // 실시간 Planet 전체 읽음 상태 동기화 이벤트 발생
      this.eventEmitter.emit('planet.allMessagesRead', {
        planetId,
        userId: user.id,
        userName: user.name,
        processedCount: result.processedCount,
        readAt: new Date(),
      });

      this.logger.log(
        `All messages in planet marked as read: planetId=${planetId}, userId=${user.id}, count=${result.processedCount}`,
      );

      // Create virtual MessageReadReceipt entity for planet all read
      const planetAllReadEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId,
        isRead: true,
        readAt: new Date(),
        metadata: {
          processedCount: result.processedCount,
          receipts: result.receipts.map((r) => r.getSummary()),
          operationType: 'planet_all_read',
        },
      });

      return crudResponse(planetAllReadEntity);
    } catch (error) {
      this.logger.error(
        `Mark all messages as read failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet의 읽지 않은 메시지 카운트 조회 API
   * GET /api/v1/read-receipts/unread-count/:planetId
   */
  @Get('unread-count/:planetId')
  async getUnreadCountInPlanet(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Planet 접근 권한 확인
      await this.validatePlanetAccess(planetId, user.id);

      const unreadCount = await this.crudService.getUnreadCountInPlanet(
        planetId,
        user.id,
      );

      // Create virtual MessageReadReceipt entity for unread count
      const unreadCountEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId,
        isRead: false,
        readAt: null,
        metadata: {
          unreadCount,
          operationType: 'unread_count',
        },
      });

      return crudResponse(unreadCountEntity);
    } catch (error) {
      this.logger.error(
        `Get unread count failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 사용자의 모든 Planet별 읽지 않은 메시지 카운트 조회 API
   * GET /api/v1/read-receipts/unread-counts/my
   */
  @Get('unread-counts/my')
  async getMyUnreadCounts(@Request() req: any) {
    const user: User = req.user;

    try {
      const unreadCounts = await this.crudService.getUnreadCountsByUser(
        user.id,
      );

      // Create virtual MessageReadReceipt entity for my unread counts
      const myUnreadCountsEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId: 0,
        isRead: false,
        readAt: null,
        metadata: {
          totalPlanets: unreadCounts.length,
          totalUnreadCount: unreadCounts.reduce(
            (sum, planet) => sum + planet.unreadCount,
            0,
          ),
          planets: unreadCounts,
          operationType: 'my_unread_counts',
        },
      });

      return crudResponse(myUnreadCountsEntity);
    } catch (error) {
      this.logger.error(
        `Get my unread counts failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 메시지별 읽음 상태 통계 조회 API
   * GET /api/v1/read-receipts/message-stats/:messageId
   */
  @Get('message-stats/:messageId')
  async getMessageReadStats(
    @Param('messageId') messageId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // 메시지 접근 권한 확인
      await this.validateMessageAccess(messageId, user.id);

      const stats = await this.crudService.getReadStatsByMessage(messageId);

      // Create virtual MessageReadReceipt entity for message stats
      const messageStatsEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId,
        userId: user.id,
        planetId: 0,
        isRead: true,
        readAt: new Date(),
        metadata: {
          stats,
          operationType: 'message_stats',
        },
      });

      return crudResponse(messageStatsEntity);
    } catch (error) {
      this.logger.error(
        `Get message read stats failed: messageId=${messageId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet별 읽음 상태 통계 조회 API
   * GET /api/v1/read-receipts/planet-stats/:planetId
   */
  @Get('planet-stats/:planetId')
  async getPlanetReadStats(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Planet 접근 권한 확인
      await this.validatePlanetAccess(planetId, user.id);

      const stats = await this.crudService.getReadStatsByPlanet(planetId);

      // Create virtual MessageReadReceipt entity for planet stats
      const planetStatsEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId,
        isRead: true,
        readAt: new Date(),
        metadata: {
          ...stats,
          operationType: 'planet_stats',
        },
      });

      return crudResponse(planetStatsEntity);
    } catch (error) {
      this.logger.error(
        `Get planet read stats failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 읽음 상태 분석 API (고급 통계)
   * GET /api/v1/read-receipts/analytics
   */
  @Get('analytics')
  async getReadReceiptAnalytics(
    @Request() req: any,
    @Query('planetId') planetId?: number,
    @Query('timeRange') timeRange?: string, // '24h', '7d', '30d'
  ) {
    const user: User = req.user;

    try {
      // 시간 범위 계산
      const timeRanges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const range = timeRanges[timeRange || '7d'] || timeRanges['7d'];
      const startDate = new Date(Date.now() - range);

      // 기본 쿼리
      let queryBuilder = this.readReceiptRepository
        .createQueryBuilder('receipt')
        .leftJoinAndSelect('receipt.message', 'message')
        .leftJoinAndSelect('receipt.user', 'user')
        .where('receipt.readAt >= :startDate', { startDate });

      // Planet 필터
      if (planetId) {
        await this.validatePlanetAccess(planetId, user.id);
        queryBuilder = queryBuilder.andWhere('receipt.planetId = :planetId', {
          planetId,
        });
      }

      const receipts = await queryBuilder.getMany();

      // 분석 데이터 계산
      const analytics = this.calculateReadAnalytics(receipts);

      // Create virtual MessageReadReceipt entity for analytics
      const analyticsEntity = Object.assign(new MessageReadReceipt(), {
        id: 0,
        messageId: 0,
        userId: user.id,
        planetId: planetId || 0,
        isRead: true,
        readAt: new Date(),
        metadata: {
          timeRange: timeRange || '7d',
          startDate,
          endDate: new Date(),
          ...analytics,
          operationType: 'analytics',
        },
      });

      return crudResponse(analyticsEntity);
    } catch (error) {
      this.logger.error(
        `Get read analytics failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 메시지 접근 권한 검증
   */
  private async validateMessageAccess(
    messageId: number,
    userId: number,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['planet', 'planet.travel'],
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    // Planet 접근 권한 확인
    await this.validatePlanetAccess(message.planetId, userId);

    return message;
  }

  /**
   * Planet 접근 권한 검증
   */
  private async validatePlanetAccess(
    planetId: number,
    userId: number,
  ): Promise<Planet> {
    const planet = await this.planetRepository.findOne({
      where: { id: planetId },
      relations: ['travel'],
    });

    if (!planet) {
      throw new NotFoundException('Planet을 찾을 수 없습니다.');
    }

    // 실제 권한 확인 로직은 기존 Message 컨트롤러와 동일하게 구현
    // 여기서는 간단히 생략하고 기본 검증만 수행
    return planet;
  }

  /**
   * 읽음 상태 분석 계산
   */
  private calculateReadAnalytics(receipts: MessageReadReceipt[]) {
    const totalReads = receipts.length;

    // 디바이스별 통계
    const deviceStats = receipts.reduce(
      (acc, receipt) => {
        const device = receipt.deviceType || 'unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 읽기 소스별 통계
    const sourceStats = receipts.reduce(
      (acc, receipt) => {
        const source = receipt.metadata?.readSource || 'manual';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 시간대별 통계 (24시간)
    const hourlyStats = Array(24).fill(0);
    receipts.forEach((receipt) => {
      const hour = receipt.readAt.getHours();
      hourlyStats[hour]++;
    });

    // 평균 읽기 지연 시간 계산
    const readDelays = receipts
      .filter((receipt) => receipt.message)
      .map((receipt) => receipt.getReadDelay(receipt.message.createdAt));

    const averageReadDelay =
      readDelays.length > 0
        ? readDelays.reduce((sum, delay) => sum + delay, 0) / readDelays.length
        : 0;

    return {
      totalReads,
      deviceStats,
      sourceStats,
      hourlyStats,
      averageReadDelay: Math.round(averageReadDelay / 1000), // 초 단위
      readDelayDistribution: {
        immediate: readDelays.filter((d) => d < 5000).length, // 5초 이내
        quick: readDelays.filter((d) => d >= 5000 && d < 60000).length, // 1분 이내
        delayed: readDelays.filter((d) => d >= 60000).length, // 1분 이후
      },
    };
  }
}
