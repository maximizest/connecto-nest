import {
  AfterCreate,
  BeforeCreate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  Logger,
  NotFoundException,
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
 * - 개별 메시지 읽음 처리: POST /read-receipts { messageId: 1 }
 * - 일괄 읽음 처리 (native bulk): POST /read-receipts [{ messageId: 1 }, { messageId: 2 }]
 * - Planet별 읽지 않은 메시지 카운트
 * - 읽음 상태 통계 및 분석
 * - 실시간 읽음 상태 동기화
 * - Upsert 로직으로 중복 방지
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
   * nestjs-crud의 native bulk support 활용
   * - 단일 객체: { messageId: 1 }
   * - 배열: [{ messageId: 1 }, { messageId: 2 }]
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    
    // nestjs-crud가 배열을 전달하는 경우 (bulk creation)
    if (Array.isArray(body)) {
      const processedReceipts: any[] = [];
      const updatedReceipts: MessageReadReceipt[] = [];
      
      for (const item of body) {
        // 각 아이템에 사용자 정보 추가
        item.userId = user.id;
        
        // 메시지 접근 권한 검증 및 planetId 설정
        const message = await this.validateMessageAccess(item.messageId, user.id);
        item.planetId = message.planetId;
        
        // 기존 읽음 확인 체크 (upsert 로직)
        const existing = await MessageReadReceipt.findOne({
          where: { messageId: item.messageId, userId: user.id },
        });
        
        if (existing) {
          // 이미 읽음 처리된 경우 업데이트
          existing.readAt = new Date();
          existing.deviceType = item.deviceType || existing.deviceType;
          existing.metadata = {
            ...existing.metadata,
            ...item.metadata,
            lastReadSource: item.readSource || 'manual',
            lastReadDuration: item.readDuration,
            lastSessionId: item.sessionId,
            updatedAt: new Date().toISOString(),
          };
          
          updatedReceipts.push(await existing.save());
        } else {
          // 새 읽음 확인 생성을 위한 데이터 준비
          item.isRead = true;
          item.readAt = new Date();
          item.metadata = {
            ...item.metadata,
            readSource: item.readSource || 'manual',
            readDuration: item.readDuration,
            sessionId: item.sessionId,
            createdAt: new Date().toISOString(),
          };
          
          processedReceipts.push(item);
        }
      }
      
      // 업데이트된 엔티티들에 대한 이벤트 발생
      updatedReceipts.forEach((receipt) => {
        this.eventEmitter.emit('message.read', {
          messageId: receipt.messageId,
          planetId: receipt.planetId,
          userId: user.id,
          userName: user.name,
          readAt: receipt.readAt,
          deviceType: receipt.deviceType,
          isUpdate: true,
        });
      });
      
      this.logger.log(
        `Bulk read receipts processing: new=${processedReceipts.length}, updated=${updatedReceipts.length}, userId=${user.id}`,
      );
      
      // 새로 생성할 데이터만 반환 (nestjs-crud가 bulk create 진행)
      return processedReceipts.length > 0 ? processedReceipts : null;
    }
    
    // 단일 객체 처리
    body.userId = user.id;
    
    // 메시지 접근 권한 검증
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
   * 단일 및 bulk 생성 모두 처리
   */
  @AfterCreate()
  async afterCreate(
    entity: MessageReadReceipt | MessageReadReceipt[] | null,
    context: any,
  ): Promise<void> {
    // upsert로 업데이트된 경우
    if (context.skipCreate && context.existingEntity) {
      entity = context.existingEntity;
    }

    if (!entity) return;

    const user: User = context.request?.user;
    
    // 배열 처리 (bulk creation)
    if (Array.isArray(entity)) {
      entity.forEach((receipt) => {
        this.eventEmitter.emit('message.read', {
          messageId: receipt.messageId,
          planetId: receipt.planetId,
          userId: user.id,
          userName: user.name,
          readAt: receipt.readAt,
          deviceType: receipt.deviceType,
          isBulkCreate: true,
        });
      });
      
      this.logger.log(
        `Bulk read receipts created: count=${entity.length}, userId=${user.id}`,
      );
      return;
    }

    // 단일 엔티티 처리
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
