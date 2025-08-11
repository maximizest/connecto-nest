import {
  AfterCreate,
  AfterUpdate,
  BeforeCreate,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CursorPaginationResponseDto,
  MessagePaginationMeta,
} from '../../../../common/dto/pagination.dto';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  PlanetUser,
  PlanetUserStatus,
} from '../../../planet-user/planet-user.entity';
import { Planet, PlanetType } from '../../../planet/planet.entity';
import {
  TravelUser,
  TravelUserStatus,
} from '../../../travel-user/travel-user.entity';
import { Travel } from '../../../travel/travel.entity';
import { User } from '../../../user/user.entity';
import { PlanetAccessGuard } from '../../guards/planet-access.guard';
import { Message, MessageStatus, MessageType } from '../../message.entity';
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
 * - Planet 접근 권한 확인 (PlanetAccessGuard)
 * - 메시지 수정/삭제는 발신자만 가능
 * - 시스템 메시지는 생성/수정 불가
 */
@Controller({ path: 'messages', version: '1' })
@Crud({
  entity: Message,

  // 허용할 CRUD 액션 (소프트 삭제는 update로 처리)
  only: ['index', 'show', 'create', 'update'],

  // 필터링 허용 필드 (보안) - 고급 필터링 지원
  allowedFilters: [
    'planetId', // Planet 필터: planetId_eq=123
    'senderId', // 발신자 필터: senderId_in=1,2,3
    'type', // 메시지 타입: type_eq=text
    'status', // 상태: status_ne=deleted
    'isDeleted', // 삭제 여부: isDeleted_eq=false
    'isEdited', // 편집 여부: isEdited_eq=true
    'replyToMessageId', // 답장: replyToMessageId_not_null
    'createdAt', // 생성일: createdAt_gte=2024-01-01, createdAt_between=2024-01-01,2024-12-31
    'updatedAt', // 수정일: updatedAt_lte=2024-12-31
    'searchableText', // 검색: searchableText_ilike=%검색어%
    'content', // 내용 검색: content_ilike=%내용%
    'readCount', // 읽음 수: readCount_gte=10
    'replyCount', // 답장 수: replyCount_gt=0
  ],

  // Body에서 허용할 파라미터 (생성/수정 시)
  allowedParams: [
    'type',
    'planetId',
    'content',
    'fileMetadata',
    'systemMetadata',
    'replyToMessageId',
    'metadata',
    'searchableText', // 업데이트용
  ],

  // 관계 포함 허용 필드
  allowedIncludes: ['sender', 'planet', 'replyToMessage'],

  // 라우트별 개별 설정 - 단순화
  routes: {
    // 목록 조회: 모든 필터링 허용, 기본 정렬은 최신순
    index: {
      allowedIncludes: ['sender', 'planet', 'replyToMessage'],
    },

    // 단일 조회: 모든 관계 정보 포함
    show: {
      allowedIncludes: ['sender', 'planet', 'replyToMessage'],
    },

    // 생성: 기본 필드만 허용
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

    // 수정: content와 소프트 삭제 필드 허용
    update: {
      allowedParams: [
        'content',
        'status',
        'isDeleted',
        'deletedAt',
        'deletedBy',
        'isEdited',
        'editedAt',
        'originalContent',
        'searchableText',
      ],
    },
  },
})
@UseGuards(AuthGuard, PlanetAccessGuard)
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(
    public readonly crudService: MessageService,
    private readonly messagePaginationService: MessagePaginationService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 메시지 생성 전 검증 및 전처리
   */
  @BeforeCreate()
  async beforeCreate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;

    // 사용자 정보 설정
    body.senderId = user.id;

    // Planet 존재 및 권한 확인
    const planet = await this.validatePlanetAccess(body.planetId, user.id);

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

    // 기본 상태 설정
    body.status = MessageStatus.SENT;
    body.isDeleted = false;
    body.isEdited = false;
    body.readCount = 0;
    body.replyCount = 0;

    // 메타데이터 설정
    if (!body.metadata) body.metadata = {};
    if (req.clientMessageId) {
      body.metadata.clientMessageId = req.clientMessageId;
    }
    body.metadata.ipAddress = req.ip;
    body.metadata.userAgent = req.get('user-agent');

    this.logger.log(
      `Creating message: type=${body.type}, planetId=${body.planetId}, senderId=${body.senderId}`,
    );

    return body;
  }

  /**
   * 메시지 생성 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: Message, @Request() req: any): Promise<Message> {
    // 답장인 경우 원본 메시지의 답장 수 증가
    if (entity.replyToMessageId) {
      await this.messageRepository.increment(
        { id: entity.replyToMessageId },
        'replyCount',
        1,
      );
    }

    this.logger.log(`Message created: id=${entity.id}, type=${entity.type}`);

    return entity;
  }

  /**
   * 메시지 수정 전 검증 (편집 및 소프트 삭제 처리)
   */
  @BeforeUpdate()
  async beforeUpdate(body: any, @Request() req: any): Promise<any> {
    const user: User = req.user;
    const messageId = req.params.id;

    // 기존 메시지 조회
    const existingMessage = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'planet'],
    });

    if (!existingMessage) {
      throw new NotFoundException('메시지를 찾을 수 없습니다.');
    }

    // 소프트 삭제 요청 처리
    if (body.isDeleted === true) {
      // 권한 확인: 발신자만 삭제 가능
      if (!existingMessage.canDelete(user.id)) {
        throw new ForbiddenException('메시지 삭제 권한이 없습니다.');
      }

      // 소프트 삭제 데이터 설정
      body.isDeleted = true;
      body.deletedAt = new Date();
      body.deletedBy = user.id;
      body.content = undefined; // 내용 제거
      body.fileMetadata = undefined; // 파일 정보 제거

      this.logger.log(
        `Soft deleting message: id=${messageId}, senderId=${user.id}`,
      );

      return body;
    }

    // 일반 편집 처리
    // 권한 확인: 발신자만 수정 가능
    if (existingMessage.senderId !== user.id) {
      throw new ForbiddenException('메시지 수정 권한이 없습니다.');
    }

    // 삭제된 메시지는 수정 불가
    if (existingMessage.isDeleted) {
      throw new ForbiddenException('삭제된 메시지는 수정할 수 없습니다.');
    }

    // 텍스트 메시지만 수정 가능
    if (body.content && !existingMessage.isTextMessage()) {
      throw new ForbiddenException('텍스트 메시지만 수정 가능합니다.');
    }

    // 수정 시간 제한 확인 (기본 15분)
    if (body.content && !existingMessage.canEdit(user.id)) {
      throw new ForbiddenException('메시지 수정 시간이 만료되었습니다.');
    }

    // content 수정 시 편집 정보 업데이트
    if (body.content && body.content !== existingMessage.content) {
      if (!existingMessage.isEdited) {
        body.originalContent = existingMessage.content; // 원본 보존
      }
      body.isEdited = true;
      body.editedAt = new Date();
      body.searchableText = this.generateSearchableText({
        ...existingMessage,
        ...body,
      });
    }

    this.logger.log(`Updating message: id=${messageId}, senderId=${user.id}`);

    return body;
  }

  /**
   * 메시지 수정 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: Message): Promise<Message> {
    this.logger.log(`Message updated: id=${entity.id}`);
    return entity;
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

    if (!planet.isActive) {
      throw new ForbiddenException('비활성화된 Planet입니다.');
    }

    // Travel 만료 확인
    if (planet.travel.isExpired()) {
      throw new ForbiddenException('만료된 Travel의 Planet입니다.');
    }

    // Planet 타입별 권한 확인
    if (planet.type === PlanetType.GROUP) {
      const travelUser = await this.travelUserRepository.findOne({
        where: {
          userId,
          travelId: planet.travelId,
          status: TravelUserStatus.ACTIVE,
        },
      });

      if (!travelUser) {
        throw new ForbiddenException('Travel 멤버만 접근할 수 있습니다.');
      }
    } else if (planet.type === PlanetType.DIRECT) {
      const planetUser = await this.planetUserRepository.findOne({
        where: { userId, planetId: planet.id, status: PlanetUserStatus.ACTIVE },
      });

      if (!planetUser) {
        throw new ForbiddenException('1:1 Planet 접근 권한이 없습니다.');
      }
    }

    return planet;
  }

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
    const replyMessage = await this.messageRepository.findOne({
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

    if (replyMessage.isDeleted) {
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
   * 메시지 편집 전용 API
   * PUT /api/v1/messages/:id/edit
   */
  @Put(':id/edit')
  @UseGuards(AuthGuard)
  async editMessage(
    @Param('id') messageId: number,
    @Body() editData: { content: string },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // 메시지 조회 및 권한 확인
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      // Planet 접근 권한 확인
      await this.validatePlanetAccess(message.planetId, user.id);

      // 편집 권한 확인
      if (message.senderId !== user.id) {
        throw new ForbiddenException('메시지 편집 권한이 없습니다.');
      }

      if (message.isDeleted) {
        throw new ForbiddenException('삭제된 메시지는 편집할 수 없습니다.');
      }

      if (!message.isTextMessage()) {
        throw new ForbiddenException('텍스트 메시지만 편집 가능합니다.');
      }

      if (!message.canEdit(user.id)) {
        throw new ForbiddenException('메시지 편집 시간이 만료되었습니다.');
      }

      // 내용이 동일하면 수정하지 않음
      if (editData.content === message.content) {
        return {
          success: true,
          message: '메시지가 이미 동일한 내용입니다.',
          data: message,
        };
      }

      // 편집 처리
      if (!message.isEdited) {
        message.originalContent = message.content; // 원본 보존
      }

      message.content = editData.content;
      message.isEdited = true;
      message.editedAt = new Date();
      message.updateSearchableText();

      // 메시지 저장
      const updatedMessage = await this.messageRepository.save(message);

      // 실시간 편집 알림 이벤트 발생
      this.eventEmitter.emit('message.edited', {
        messageId: updatedMessage.id,
        planetId: updatedMessage.planetId,
        content: updatedMessage.content,
        originalContent: updatedMessage.originalContent,
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.editedAt,
        editedBy: { id: user.id, name: user.name },
      });

      this.logger.log(`Message edited: id=${messageId}, senderId=${user.id}`);

      return {
        success: true,
        message: '메시지가 성공적으로 편집되었습니다.',
        data: {
          id: updatedMessage.id,
          content: updatedMessage.content,
          originalContent: updatedMessage.originalContent,
          isEdited: updatedMessage.isEdited,
          editedAt: updatedMessage.editedAt,
          searchableText: updatedMessage.searchableText,
        },
      };
    } catch (error) {
      this.logger.error(
        `Message edit failed: id=${messageId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 메시지 삭제 전용 API
   * DELETE /api/v1/messages/:id
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteMessage(@Param('id') messageId: number, @Request() req: any) {
    const user: User = req.user;

    try {
      // 메시지 조회 및 권한 확인
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      // Planet 접근 권한 확인
      await this.validatePlanetAccess(message.planetId, user.id);

      // 이미 삭제된 메시지 확인
      if (message.isDeleted) {
        return {
          success: true,
          message: '이미 삭제된 메시지입니다.',
          data: { id: messageId, isDeleted: true },
        };
      }

      // 삭제 권한 확인 (발신자 또는 Planet 관리자)
      const hasDeletePermission = await this.checkDeletePermission(
        message,
        user.id,
      );

      if (!hasDeletePermission) {
        throw new ForbiddenException('메시지 삭제 권한이 없습니다.');
      }

      // 소프트 삭제 처리
      message.softDelete(user.id);

      // 메시지 저장
      const deletedMessage = await this.messageRepository.save(message);

      // 실시간 삭제 알림 이벤트 발생
      this.eventEmitter.emit('message.deleted', {
        messageId: deletedMessage.id,
        planetId: deletedMessage.planetId,
        isDeleted: deletedMessage.isDeleted,
        deletedAt: deletedMessage.deletedAt,
        deletedBy: { id: user.id, name: user.name },
      });

      this.logger.log(`Message deleted: id=${messageId}, deletedBy=${user.id}`);

      return {
        success: true,
        message: '메시지가 성공적으로 삭제되었습니다.',
        data: {
          id: deletedMessage.id,
          isDeleted: deletedMessage.isDeleted,
          deletedAt: deletedMessage.deletedAt,
          deletedBy: deletedMessage.deletedBy,
        },
      };
    } catch (error) {
      this.logger.error(
        `Message delete failed: id=${messageId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 메시지 편집 기록 조회 API
   * GET /api/v1/messages/:id/edit-history
   */
  @Get(':id/edit-history')
  @UseGuards(AuthGuard)
  async getEditHistory(@Param('id') messageId: number, @Request() req: any) {
    const user: User = req.user;

    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet'],
      });

      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      // Planet 접근 권한 확인
      await this.validatePlanetAccess(message.planetId, user.id);

      if (!message.isEdited) {
        return {
          success: true,
          message: '편집 기록이 없습니다.',
          data: {
            id: messageId,
            isEdited: false,
            editHistory: [],
          },
        };
      }

      return {
        success: true,
        message: '편집 기록을 가져왔습니다.',
        data: {
          id: messageId,
          isEdited: message.isEdited,
          editedAt: message.editedAt,
          editHistory: [
            {
              version: 1,
              content: message.originalContent,
              timestamp: message.createdAt,
              isOriginal: true,
            },
            {
              version: 2,
              content: message.content,
              timestamp: message.editedAt,
              isOriginal: false,
            },
          ],
        },
      };
    } catch (error) {
      this.logger.error(
        `Edit history retrieval failed: id=${messageId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 메시지 복구 API (소프트 삭제된 메시지 복구)
   * POST /api/v1/messages/:id/restore
   */
  @Post(':id/restore')
  @UseGuards(AuthGuard)
  async restoreMessage(@Param('id') messageId: number, @Request() req: any) {
    const user: User = req.user;

    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        throw new NotFoundException('메시지를 찾을 수 없습니다.');
      }

      // Planet 접근 권한 확인
      await this.validatePlanetAccess(message.planetId, user.id);

      if (!message.isDeleted) {
        return {
          success: true,
          message: '이미 활성화된 메시지입니다.',
          data: { id: messageId, isDeleted: false },
        };
      }

      // 복구 권한 확인 (원래 발신자 또는 Planet 관리자)
      const hasRestorePermission = await this.checkDeletePermission(
        message,
        user.id,
      );

      if (!hasRestorePermission) {
        throw new ForbiddenException('메시지 복구 권한이 없습니다.');
      }

      // 복구 처리 (24시간 내에만 가능)
      const deletedHoursAgo =
        (Date.now() - (message.deletedAt?.getTime() || 0)) / (1000 * 60 * 60);

      if (deletedHoursAgo > 24) {
        throw new ForbiddenException(
          '삭제된 지 24시간이 넘은 메시지는 복구할 수 없습니다.',
        );
      }

      // 복구 처리
      message.isDeleted = false;
      message.deletedAt = undefined;
      message.deletedBy = undefined;

      const restoredMessage = await this.messageRepository.save(message);

      // 실시간 복구 알림 이벤트 발생
      this.eventEmitter.emit('message.restored', {
        messageId: restoredMessage.id,
        planetId: restoredMessage.planetId,
        content: restoredMessage.content,
        isDeleted: restoredMessage.isDeleted,
        restoredBy: { id: user.id, name: user.name },
        restoredAt: new Date(),
      });

      this.logger.log(
        `Message restored: id=${messageId}, restoredBy=${user.id}`,
      );

      return {
        success: true,
        message: '메시지가 성공적으로 복구되었습니다.',
        data: {
          id: restoredMessage.id,
          isDeleted: restoredMessage.isDeleted,
          content: restoredMessage.content,
          restoredBy: user.id,
          restoredAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Message restore failed: id=${messageId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 삭제 권한 확인 (발신자 또는 Planet 관리자)
   */
  private async checkDeletePermission(
    message: Message,
    userId: number,
  ): Promise<boolean> {
    // 발신자는 항상 삭제 가능
    if (message.senderId === userId) {
      return true;
    }

    // Planet 관리자 권한 확인
    if (message.planet.type === PlanetType.GROUP) {
      // GROUP Planet: Travel 관리자 확인
      const travelUser = await this.travelUserRepository.findOne({
        where: {
          userId,
          travelId: message.planet.travelId,
          status: TravelUserStatus.ACTIVE,
        },
      });

      return !!(
        travelUser &&
        (travelUser.role === 'owner' || travelUser.role === 'admin')
      );
    } else if (message.planet.type === PlanetType.DIRECT) {
      // DIRECT Planet: Planet 생성자만 관리자 권한
      const planetUser = await this.planetUserRepository.findOne({
        where: {
          userId,
          planetId: message.planetId,
          status: PlanetUserStatus.ACTIVE,
        },
      });

      return !!(planetUser && planetUser.role === 'moderator');
    }

    return false;
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
      const message = await this.messageRepository.findOne({
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
    } catch (error) {
      const user = req.user;
      this.logger.error(
        `Failed to get message context: messageId=${messageId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet 메시지 통계 조회
   * GET /api/v1/messages/planet/:planetId/stats
   */
  @Get('planet/:planetId/stats')
  async getPlanetMessageStats(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ): Promise<MessagePaginationMeta> {
    try {
      const user = req.user;
      this.logger.log(
        `Getting message stats for planet ${planetId} by user ${user.id}`,
      );

      return await this.messagePaginationService.getPlanetMessageStats(
        planetId,
        user.id,
      );
    } catch (error) {
      const user = req.user;
      this.logger.error(
        `Failed to get message stats: planetId=${planetId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet 메시지 캐시 무효화 (관리자용)
   * DELETE /api/v1/messages/planet/:planetId/cache
   */
  @Delete('planet/:planetId/cache')
  async invalidatePlanetMessageCache(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = req.user;
      this.logger.log(
        `Invalidating message cache for planet ${planetId} by user ${user.id}`,
      );

      await this.messagePaginationService.invalidatePlanetCache(planetId);

      return {
        success: true,
        message: `Planet ${planetId}의 메시지 캐시가 무효화되었습니다.`,
      };
    } catch (error) {
      const user = req.user;
      this.logger.error(
        `Failed to invalidate cache: planetId=${planetId}, user=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
