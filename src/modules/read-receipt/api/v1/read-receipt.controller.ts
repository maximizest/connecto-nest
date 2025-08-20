import {
  AfterCreate,
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
import { validateRoleBasedPlanetAccess } from '../../../../common/helpers/role-based-permission.helper';
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
  only: ['index', 'show', 'create'],

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
    'messageIds', // bulk 작업용
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 읽음 영수증 생성 전 검증 및 전처리
   * 단일 및 복수 메시지 처리 지원
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // 사용자 정보 설정
    body.userId = user.id;

    // 복수 메시지 처리 (messageIds 배열)
    if (body.messageIds && Array.isArray(body.messageIds)) {
      const receipts = await this.crudService.markMultipleMessagesAsRead(
        body.messageIds,
        user.id,
        {
          deviceType: body.deviceType,
          userAgent: context.request?.headers?.['user-agent'],
          readSource: body.readSource || 'manual',
          sessionId: body.sessionId,
        },
      );

      // 실시간 동기화 이벤트
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

      // 배치 작업 완료 후 중단
      context.skipCreate = true;
      context.existingEntity = receipts[0]; // 첫 번째 영수증 반환
      context.batchResult = receipts;

      this.logger.log(
        `Batch read receipts created: count=${receipts.length}, userId=${user.id}`,
      );

      return null;
    }

    // 단일 메시지 처리
    const message = await this.validateMessageAccess(body.messageId, user.id);
    body.planetId = message.planetId;

    // 기존 읽음 확인 체크 (upsert 로직)
    const existing = await MessageReadReceipt.findOne({
      where: { messageId: body.messageId, userId: user.id },
    });

    if (existing) {
      // 이미 읽음 처리된 경우 업데이트
      existing.readAt = new Date();
      existing.deviceType = body.deviceType || existing.deviceType;
      existing.metadata = {
        ...existing.metadata,
        ...body.metadata,
        lastReadSource: body.readSource || 'manual',
        lastReadDuration: body.readDuration,
        lastSessionId: body.sessionId,
        updatedAt: new Date().toISOString(),
      };

      const updated = await existing.save();
      context.skipCreate = true;
      context.existingEntity = updated;
      context.isUpdate = true;

      this.logger.log(
        `Updated existing read receipt: messageId=${body.messageId}, userId=${user.id}`,
      );

      return null;
    }

    // 새 읽음 확인 생성
    body.isRead = true;
    body.readAt = new Date();
    body.metadata = {
      ...body.metadata,
      readSource: body.readSource || 'manual',
      readDuration: body.readDuration,
      sessionId: body.sessionId,
      createdAt: new Date().toISOString(),
    };

    this.logger.log(
      `Creating new read receipt: messageId=${body.messageId}, userId=${user.id}`,
    );

    return body;
  }

  /**
   * 읽음 영수증 생성/업데이트 후 처리
   * 이벤트 발행 및 메시지 카운트 업데이트
   */
  @AfterCreate()
  async afterCreate(
    entity: MessageReadReceipt | null,
    context: any,
  ): Promise<void> {
    // upsert로 업데이트된 경우
    if (context.skipCreate && context.existingEntity) {
      entity = context.existingEntity;
    }

    if (!entity) return;

    const user: User = context.request?.user;

    // 실시간 읽음 상태 동기화 이벤트 발생
    this.eventEmitter.emit('message.read', {
      messageId: entity.messageId,
      planetId: entity.planetId,
      userId: user.id,
      userName: user.name,
      readAt: entity.readAt,
      deviceType: entity.deviceType,
      isUpdate: context.isUpdate || false,
    });

    // readCount는 이제 관계에서 자동으로 계산되므로 업데이트 불필요

    this.logger.log(
      `Read receipt ${context.isUpdate ? 'updated' : 'created'}: messageId=${entity.messageId}, userId=${user.id}`,
    );
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
   * 통계 및 집계 데이터 조회 API
   * GET /api/v1/read-receipts/stats
   * 
   * 읽지 않은 메시지 수, 마지막 읽은 시간 등 집계 데이터 제공
   */
  @Get('stats')
  async getStats(
    @Query() query: { 
      planetId?: number;
      userId?: number;
      type?: 'unread' | 'summary' | 'all';
    },
    @Request() req: any,
  ) {
    const user: User = req.user;
    const targetUserId = query.userId || user.id;

    try {
      // 특정 Planet의 읽지 않은 수
      if (query.planetId && query.type === 'unread') {
        await validateRoleBasedPlanetAccess(query.planetId, targetUserId);
        
        const unreadCount = await this.crudService.getUnreadCountInPlanet(
          query.planetId,
          targetUserId,
        );

        return {
          planetId: query.planetId,
          userId: targetUserId,
          unreadCount,
          type: 'planet_unread',
        };
      }

      // 사용자의 전체 Planet별 읽지 않은 수
      if (query.type === 'all' || !query.planetId) {
        const unreadCounts = await this.crudService.getUnreadCountsByUser(
          targetUserId,
        );

        return {
          userId: targetUserId,
          totalUnread: unreadCounts.reduce(
            (sum, planet) => sum + planet.unreadCount,
            0,
          ),
          planets: unreadCounts,
          type: 'user_unread_summary',
        };
      }

      // 기본: 요약 정보
      return {
        userId: targetUserId,
        planetId: query.planetId,
        type: 'summary',
        message: 'Use type=unread or type=all for specific stats',
      };
    } catch (_error) {
      this.logger.error(
        `Get stats failed: planetId=${query.planetId}, userId=${targetUserId}, error=${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * 메시지 접근 권한 검증
   */
  private async validateMessageAccess(
    messageId: number,
    userId: number,
  ): Promise<Message> {
    const message = await Message.findOne({
      where: { id: messageId },
      relations: ['planet', 'planet.travel'],
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    // Planet 접근 권한 확인 (역할 기반)
    await validateRoleBasedPlanetAccess(message.planetId, userId);

    return message;
  }

  // validatePlanetAccess 메서드는 role-based-permission.helper.ts의 validateRoleBasedPlanetAccess로 대체되었습니다.
}
