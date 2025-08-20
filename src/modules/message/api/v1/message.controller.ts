import {
  AfterCreate,
  AfterDestroy,
  AfterRecover,
  AfterShow,
  AfterUpdate,
  BeforeCreate,
  BeforeDestroy,
  BeforeShow,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CursorPaginationResponseDto } from '../../../../common/dto/pagination.dto';
import {
  validateRoleBasedPlanetAccess,
  validateChatPermission,
} from '../../../../common/helpers/role-based-permission.helper';
import { AuthGuard } from '../../../../guards/auth.guard';
import { PlanetUser } from '../../../planet-user/planet-user.entity';
import { PlanetUserStatus } from '../../../planet-user/enums/planet-user-status.enum';
import { Planet } from '../../../planet/planet.entity';
import { PlanetType } from '../../../planet/enums/planet-type.enum';
import { TravelUser } from '../../../travel-user/travel-user.entity';
import { TravelUserStatus } from '../../../travel-user/enums/travel-user-status.enum';
import { User } from '../../../user/user.entity';
import { Message } from '../../message.entity';
import { MessageType } from '../../enums/message-type.enum';
import { MessageService } from '../../message.service';
import { MessagePaginationService } from '../../services/message-pagination.service';

/**
 * Message API Controller (v1)
 *
 * Travel/Planet 범위 내에서 메시지 CRUD 작업을 수행합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 행성 아이디를 필수 필터로 받아야 함 (planetId 필터 필수)
 * - 본인이 속해있는 행성의 메시지만 조회/생성 가능
 * - 메시지 수정/삭제는 본인의 메시지만 가능
 * - 시스템 메시지는 생성/수정 불가
 */
@Controller({ path: 'messages', version: '1' })
@Crud({
  entity: Message,
  only: ['index', 'show', 'create', 'update', 'destroy'],
  allowedFilters: [
    'planetId',
    'senderId',
    'type',
    'status',
    'isEdited',
    'replyToMessageId',
    'createdAt',
    'updatedAt',
    'searchableText',
    'content',
  ],
  allowedParams: [
    'type',
    'planetId',
    'content',
    'fileMetadata',
    'systemMetadata',
    'replyToMessageId',
    'metadata',
    'searchableText',
  ],
  allowedIncludes: [
    'sender',
    'planet',
    'replyToMessage',
    'readReceipts',
    'replies',
  ],
  routes: {
    index: {
      allowedIncludes: [
        'sender',
        'planet',
        'replyToMessage',
        'readReceipts',
        'replies',
      ],
    },
    show: {
      allowedIncludes: [
        'sender',
        'planet',
        'replyToMessage',
        'readReceipts',
        'replies',
      ],
    },
    create: {
      allowedParams: [
        'type',
        'planetId',
        'content',
        'fileMetadata',
        'systemMetadata',
        'replyToMessageId',
        'metadata',
      ],
    },
    update: {
      allowedParams: [
        'content',
        'isEdited',
        'editedAt',
        'originalContent',
        'searchableText',
      ],
    },
    destroy: {
      softDelete: true,
    },
  },
})
@UseGuards(AuthGuard)
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(
    public readonly crudService: MessageService,
    private readonly messagePaginationService: MessagePaginationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 메시지 조회 전 권한 확인 (본인이 속해있는 행성의 메시지만 조회 가능)
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    const messageId = parseInt(params.id, 10);

    // 조회하려는 메시지 정보 가져오기 - Active Record 패턴 사용
    const message = await Message.findOne({
      where: { id: messageId },
      relations: ['planet'],
    });

    if (!message) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    // Planet 접근 권한 확인 (역할 기반)
    await validateRoleBasedPlanetAccess(message.planetId, user.id);

    return params;
  }

  /**
   * 메시지 생성 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // 사용자 정보 설정
    body.senderId = user.id;

    // Planet 존재 및 권한 확인 (역할 기반)
    const planet = await validateRoleBasedPlanetAccess(body.planetId, user.id);

    // 채팅 권한 확인 (벤 상태 포함)
    const chatPermission = await validateChatPermission(user.id, body.planetId);
    if (!chatPermission.canChat) {
      throw new ForbiddenException(
        `채팅 권한이 없습니다: ${chatPermission.reason}`,
      );
    }

    // Planet 시간 제한 확인
    if (planet.timeRestriction && !planet.isChatAllowed()) {
      throw new ForbiddenException('현재 시간에는 채팅이 제한됩니다.');
    }

    // 메시지 타입별 검증
    this.validateMessageType(body);

    // 답장 메시지 검증
    if (body.replyToMessageId) {
      await this.validateReplyMessage(body.replyToMessageId, body.planetId);
    }

    // 검색용 텍스트 생성
    body.searchableText = this.generateSearchableText(body);

    // 메타데이터 설정
    if (!body.metadata) body.metadata = {};
    if (context.request?.clientMessageId) {
      body.metadata.clientMessageId = context.request.clientMessageId;
    }
    body.metadata.ipAddress = context.request?.ip;
    body.metadata.userAgent = context.request?.get('user-agent');

    this.logger.log(
      `Creating message: type=${body.type}, planetId=${body.planetId}, senderId=${body.senderId}`,
    );

    return body;
  }

  /**
   * 메시지 생성 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: Message): Promise<Message> {
    // replyCount는 이제 관계에서 자동으로 계산되므로 업데이트 불필요
    // 답장 관계는 TypeORM이 자동으로 처리

    this.logger.log(`Message created: id=${entity.id}, type=${entity.type}`);

    return entity;
  }

  /**
   * 메시지 수정 전 검증 (편집 처리)
   */
  @BeforeUpdate()
  async beforeUpdate(entity: Message, context: any): Promise<Message> {
    const user: User = context.request?.user;
    const messageId = entity.id;

    // 권한 확인: 발신자만 수정 가능
    if (entity.senderId !== user.id) {
      throw new ForbiddenException('메시지 수정 권한이 없습니다.');
    }

    // 삭제된 메시지는 수정 불가
    if (entity.deletedAt) {
      throw new ForbiddenException('삭제된 메시지는 수정할 수 없습니다.');
    }

    // 텍스트 메시지만 수정 가능
    if (entity.content && !entity.isTextMessage()) {
      throw new ForbiddenException('텍스트 메시지만 수정 가능합니다.');
    }

    // 수정 시간 제한 확인 (기본 15분)
    if (entity.content && !entity.canEdit(user.id)) {
      throw new ForbiddenException('메시지 수정 시간이 만료되었습니다.');
    }

    // content 수정 시 편집 정보 업데이트
    const originalContent = context.currentEntity?.content;
    if (entity.content && entity.content !== originalContent) {
      if (!entity.isEdited) {
        entity.originalContent = originalContent; // 원본 보존
      }
      entity.isEdited = true;
      entity.editedAt = new Date();
      entity.searchableText = this.generateSearchableText(entity);
    }

    this.logger.log(`Updating message: id=${messageId}, senderId=${user.id}`);

    return entity;
  }

  /**
   * 메시지 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: Message, context: any): Promise<Message> {
    const user = context.request?.user;

    // 편집된 경우 실시간 알림 이벤트 발생
    if (entity.isEdited) {
      this.eventEmitter.emit('message.edited', {
        messageId: entity.id,
        planetId: entity.planetId,
        content: entity.content,
        originalContent: entity.originalContent,
        isEdited: entity.isEdited,
        editedAt: entity.editedAt,
        editedBy: { id: user.id, name: user.name },
      });
    }

    this.logger.log(`Message updated: id=${entity.id}`);
    return entity;
  }

  /**
   * 메시지 삭제 전 처리 (Soft Delete)
   */
  @BeforeDestroy()
  async beforeDestroy(entity: Message, context: any): Promise<Message> {
    const user = context.request?.user;

    // Planet 접근 권한 확인 (역할 기반)
    await validateRoleBasedPlanetAccess(entity.planetId, user.id);

    // 삭제 권한 확인 (발신자만)
    if (!entity.canDelete(user.id)) {
      throw new ForbiddenException('메시지 삭제 권한이 없습니다.');
    }

    // 삭제 메타데이터 설정
    entity.prepareForSoftDelete(user.id, context.request?.body?.reason);

    this.logger.log(
      `Message soft-delete initiated: id=${entity.id}, deletedBy=${user.id}`,
    );

    return entity;
  }

  /**
   * 메시지 삭제 후 처리
   */
  @AfterDestroy()
  async afterDestroy(entity: Message, context: any): Promise<Message> {
    // 실시간 삭제 알림 이벤트 발생
    this.eventEmitter.emit('message.deleted', {
      messageId: entity.id,
      planetId: entity.planetId,
      deletedAt: entity.deletedAt,
      deletedBy: entity.deletedBy,
    });

    this.logger.log(`Message soft-deleted: id=${entity.id}`);

    return entity;
  }

  /**
   * 메시지 복구 후 처리 (Soft Delete 복구)
   */
  @AfterRecover()
  async afterRecover(entity: Message, context: any): Promise<Message> {
    // 복구 시 메타데이터 정리
    entity.deletedBy = undefined;
    entity.deletionReason = undefined;

    // 실시간 복구 알림 이벤트 발생
    this.eventEmitter.emit('message.recovered', {
      messageId: entity.id,
      planetId: entity.planetId,
    });

    this.logger.log(`Message recovered: id=${entity.id}`);

    return entity;
  }

  // validatePlanetAccess 메서드는 role-based-permission.helper.ts의 validateRoleBasedPlanetAccess로 대체되었습니다.

  /**
   * 메시지 타입별 검증
   */
  private validateMessageType(body: any): void {
    switch (body.type) {
      case MessageType.TEXT:
        if (!body.content || body.content.trim().length === 0) {
          throw new ForbiddenException('텍스트 메시지에는 내용이 필요합니다.');
        }
        break;

      case MessageType.IMAGE:
      case MessageType.VIDEO:
      case MessageType.FILE:
        if (!body.fileMetadata) {
          throw new ForbiddenException(
            '파일 메시지에는 파일 정보가 필요합니다.',
          );
        }
        break;

      case MessageType.SYSTEM:
        throw new ForbiddenException(
          '시스템 메시지는 직접 생성할 수 없습니다.',
        );

      default:
        throw new ForbiddenException('지원하지 않는 메시지 타입입니다.');
    }
  }

  /**
   * 답장 메시지 검증
   */
  private async validateReplyMessage(
    replyMessageId: number,
    planetId: number,
  ): Promise<void> {
    const replyMessage = await Message.findOne({
      where: { id: replyMessageId },
    });

    if (!replyMessage) {
      throw new NotFoundException('답장 대상 메시지를 찾을 수 없습니다.');
    }

    if (replyMessage.planetId !== planetId) {
      throw new ForbiddenException(
        '다른 Planet의 메시지에는 답장할 수 없습니다.',
      );
    }

    if (replyMessage.deletedAt) {
      throw new ForbiddenException('삭제된 메시지에는 답장할 수 없습니다.');
    }
  }

  /**
   * 검색용 텍스트 생성
   */
  private generateSearchableText(messageData: any): string {
    let searchText = '';

    if (messageData.content) {
      searchText += messageData.content + ' ';
    }

    if (messageData.fileMetadata?.originalName) {
      searchText += messageData.fileMetadata.originalName + ' ';
    }

    if (messageData.systemMetadata?.reason) {
      searchText += messageData.systemMetadata.reason + ' ';
    }

    return searchText.trim().toLowerCase();
  }

  /**
   * ============================================
   * 최적화된 페이지네이션 엔드포인트들
   * ============================================
   */

  /**
   * 특정 메시지 주변 컨텍스트 조회
   * GET /api/v1/messages/:messageId/context
   */
  @Get(':messageId/context')
  async getMessageContext(
    @Param('messageId') messageId: number,
    @Query('contextSize') contextSize: number = 10,
    @Request() req: any,
  ): Promise<CursorPaginationResponseDto<any>> {
    try {
      const user = req.user;
      this.logger.log(
        `Getting message context: messageId=${messageId}, contextSize=${contextSize}, user=${user.id}`,
      );

      // 메시지 정보 조회하여 planetId 확인
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['planet'],
      });

      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      return await this.messagePaginationService.getMessageContext(
        messageId,
        message.planetId,
        Math.min(Math.max(contextSize, 5), 50), // 5-50 범위로 제한
        user.id,
      );
    } catch (_error) {
      const user = req.user;
      this.logger.error(
        `Failed to get message context: messageId=${messageId}, user=${user.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * 단일 메시지 조회 후 count 필드 계산
   */
  @AfterShow()
  async afterShow(entity: Message, context: any): Promise<Message> {
    // loadRelationCountAndMap를 사용하면 자동으로 계산되지만,
    // include로 관계를 로드한 경우 직접 계산
    if (entity.readReceipts) {
      entity.readCount = entity.readReceipts.length;
    }
    if (entity.replies) {
      entity.replyCount = entity.replies.length;
    }
    return entity;
  }
}
