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

  // 필터링 허용 필드 (보안)
  allowedFilters: [
    'planetId',
    'senderId',
    'type',
    'status',
    'isDeleted',
    'isEdited',
    'replyToMessageId',
    'createdAt',
    'updatedAt',
    'searchableText', // 검색용
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

  // 라우트별 개별 설정
  routes: {
    // 목록 조회: Planet 범위로 제한
    index: {
      allowedFilters: [
        'planetId', // 필수 필터
        'senderId',
        'type',
        'status',
        'isDeleted',
        'createdAt',
        'searchableText',
      ],
      allowedIncludes: ['sender'],
    },

    // 단일 조회: 발신자 정보 포함
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
        'status', // 읽음 처리용
        'isDeleted', // 소프트 삭제용
        'deletedAt', // 소프트 삭제 시간
        'deletedBy', // 소프트 삭제한 사용자
        'isEdited', // 편집 여부
        'editedAt', // 편집 시간
        'originalContent', // 원본 내용 보존
        'searchableText', // 검색 텍스트 업데이트
      ],
    },
  },
})
@UseGuards(AuthGuard, PlanetAccessGuard)
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(
    public readonly crudService: MessageService,
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
}
