import { Injectable, Logger } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Message } from '../message/message.entity';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { PlanetUserStatus } from '../planet-user/enums/planet-user-status.enum';
import { Planet } from '../planet/planet.entity';
import { PlanetType } from '../planet/enums/planet-type.enum';
import { PlanetStatus } from '../planet/enums/planet-status.enum';
import { TravelUser } from '../travel-user/travel-user.entity';
import { TravelUserStatus } from '../travel-user/enums/travel-user-status.enum';
import { MessageReadReceipt } from './read-receipt.entity';
import { PlanetReadStatus } from './types/planet-read-status.interface';

@Injectable()
export class ReadReceiptService extends CrudService<MessageReadReceipt> {
  private readonly logger = new Logger(ReadReceiptService.name);

  constructor() {
    super(MessageReadReceipt.getRepository());
  }

  /**
   * 메시지 읽음 처리
   */
  async markMessageAsRead(
    messageId: number,
    userId: number,
    options?: {
      deviceType?: string;
      userAgent?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      readDuration?: number;
      sessionId?: string;
    },
  ): Promise<MessageReadReceipt> {
    try {
      // 메시지 정보 조회
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['planet'],
      });

      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // 이미 읽음 처리된 경우 기존 레코드 반환
      const existingReceipt = await MessageReadReceipt.findOne({
        where: {
          messageId,
          userId,
        },
      });

      if (existingReceipt) {
        this.logger.debug(
          `Message already read: messageId=${messageId}, userId=${userId}`,
        );
        return existingReceipt;
      }

      // 새로운 읽음 영수증 생성
      const receipt = MessageReadReceipt.create({
        messageId,
        userId,
        planetId: message.planetId,
        isRead: true,
        readAt: new Date(),
        deviceType: options?.deviceType,
        userAgent: options?.userAgent,
        metadata: {
          readSource: options?.readSource || 'manual',
          readDuration: options?.readDuration,
          sessionId: options?.sessionId,
        },
      });

      const savedReceipt = await receipt.save();

      // 메시지의 읽음 카운트 업데이트
      await this.updateMessageReadCount(messageId);

      this.logger.log(
        `Message marked as read: messageId=${messageId}, userId=${userId}`,
      );

      return savedReceipt;
    } catch (_error) {
      this.logger.error(
        `Failed to mark message as read: messageId=${messageId}, userId=${userId}`,
        _error,
      );
      throw _error;
    }
  }

  /**
   * 여러 메시지를 일괄 읽음 처리
   */
  async markMultipleMessagesAsRead(
    messageIds: number[],
    userId: number,
    options?: {
      deviceType?: string;
      userAgent?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      sessionId?: string;
    },
  ): Promise<MessageReadReceipt[]> {
    try {
      const receipts: MessageReadReceipt[] = [];

      // 이미 읽은 메시지들 확인
      const existingReceipts = await MessageReadReceipt.find({
        where: {
          messageId: messageIds.length > 0 ? (messageIds as any) : undefined,
          userId,
        },
      });

      const existingMessageIds = existingReceipts.map((r) => r.messageId);
      const newMessageIds = messageIds.filter(
        (id) => !existingMessageIds.includes(id),
      );

      if (newMessageIds.length === 0) {
        this.logger.debug(
          `All messages already read by user: userId=${userId}`,
        );
        return existingReceipts;
      }

      // 새로운 메시지들 정보 조회
      const messages = await Message.find({
        where: {
          id: newMessageIds.length > 0 ? (newMessageIds as any) : undefined,
        },
        relations: ['planet'],
      });

      // 일괄 읽음 영수증 생성
      const newReceipts = messages.map((message) =>
        MessageReadReceipt.create({
          messageId: message.id,
          userId,
          planetId: message.planetId,
          isRead: true,
          readAt: new Date(),
          deviceType: options?.deviceType,
          userAgent: options?.userAgent,
          metadata: {
            readSource: options?.readSource || 'auto',
            sessionId: options?.sessionId,
            batchReadCount: newMessageIds.length,
          },
        }),
      );

      const savedReceipts = await MessageReadReceipt.save(newReceipts);
      receipts.push(...existingReceipts, ...savedReceipts);

      // 각 메시지의 읽음 카운트 업데이트
      await Promise.all(
        newMessageIds.map((messageId) =>
          this.updateMessageReadCount(messageId),
        ),
      );

      this.logger.log(
        `Batch read processing completed: ${newMessageIds.length} messages, userId=${userId}`,
      );

      return receipts;
    } catch (_error) {
      this.logger.error(
        `Failed to batch mark messages as read: userId=${userId}`,
        _error,
      );
      throw _error;
    }
  }

  /**
   * Planet의 마지막 읽은 메시지 이후의 모든 메시지를 읽음 처리
   */
  async markAllMessagesAsReadInPlanet(
    planetId: number,
    userId: number,
    options?: {
      deviceType?: string;
      userAgent?: string;
      sessionId?: string;
    },
  ): Promise<{ processedCount: number; receipts: MessageReadReceipt[] }> {
    try {
      // Planet의 마지막 읽은 메시지 찾기
      const lastReadReceipt = await MessageReadReceipt.findOne({
        where: { planetId, userId },
        order: { readAt: 'DESC' },
      });

      // 마지막 읽은 메시지 이후의 모든 메시지 조회
      const queryBuilder = Message.createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.isDeleted = :isDeleted', { isDeleted: false });

      if (lastReadReceipt) {
        queryBuilder.andWhere('message.createdAt > :lastReadAt', {
          lastReadAt: lastReadReceipt.readAt,
        });
      }

      const unreadMessages = await queryBuilder.getMany();

      if (unreadMessages.length === 0) {
        return { processedCount: 0, receipts: [] };
      }

      const messageIds = unreadMessages.map((m) => m.id);
      const receipts = await this.markMultipleMessagesAsRead(
        messageIds,
        userId,
        {
          ...options,
          readSource: 'auto',
        },
      );

      this.logger.log(
        `All messages in planet marked as read: planetId=${planetId}, userId=${userId}, count=${receipts.length}`,
      );

      return { processedCount: receipts.length, receipts };
    } catch (_error) {
      this.logger.error(
        `Failed to mark all messages as read in planet: planetId=${planetId}, userId=${userId}`,
        _error,
      );
      throw _error;
    }
  }

  /**
   * Planet의 읽지 않은 메시지 카운트 조회
   */
  async getUnreadCountInPlanet(
    planetId: number,
    userId: number,
  ): Promise<number> {
    try {
      // Planet의 모든 메시지 조회 (삭제되지 않은 것만)
      const totalMessagesQuery = Message.createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.isDeleted = :isDeleted', { isDeleted: false })
        .getCount();

      // 사용자가 읽은 메시지 조회
      const readMessagesQuery = MessageReadReceipt.createQueryBuilder('receipt')
        .where('receipt.planetId = :planetId', { planetId })
        .andWhere('receipt.userId = :userId', { userId })
        .andWhere('receipt.isRead = :isRead', { isRead: true })
        .getCount();

      const [totalMessages, readMessages] = await Promise.all([
        totalMessagesQuery,
        readMessagesQuery,
      ]);

      return Math.max(0, totalMessages - readMessages);
    } catch (_error) {
      this.logger.error(
        `Failed to get unread count: planetId=${planetId}, userId=${userId}`,
        _error,
      );
      return 0;
    }
  }

  /**
   * 사용자의 모든 Planet별 읽지 않은 메시지 카운트 조회
   */
  async getUnreadCountsByUser(userId: number): Promise<PlanetReadStatus[]> {
    try {
      // 사용자가 접근할 수 있는 Planet 조회
      const accessiblePlanets = await this.getAccessiblePlanets(userId);

      const results: PlanetReadStatus[] = [];

      for (const planet of accessiblePlanets) {
        // 각 Planet별 읽지 않은 카운트 계산
        const unreadCount = await this.getUnreadCountInPlanet(
          planet.id,
          userId,
        );

        // 마지막 읽은 메시지 정보
        const lastReadReceipt = await MessageReadReceipt.findOne({
          where: { planetId: planet.id, userId },
          order: { readAt: 'DESC' },
        });

        // Planet의 총 메시지 수 (삭제되지 않은 메시지만)
        const totalMessages = await Message.count({
          where: {
            planetId: planet.id,
          },
          withDeleted: false,
        });

        results.push({
          planetId: planet.id,
          planetName: planet.name,
          lastReadMessageId: lastReadReceipt?.messageId || null,
          lastReadAt: lastReadReceipt?.readAt || null,
          unreadCount,
          totalMessages,
        });
      }

      return results;
    } catch (_error) {
      this.logger.error(
        `Failed to get unread counts by user: userId=${userId}`,
        _error,
      );
      return [];
    }
  }

  /**
   * 메시지의 읽음 카운트 업데이트 (Message 엔티티)
   */
  private async updateMessageReadCount(messageId: number): Promise<void> {
    try {
      const readCount = await MessageReadReceipt.count({
        where: { messageId, isRead: true },
      });

      await Message.update(messageId, {
        readCount,
        firstReadAt: readCount === 1 ? new Date() : undefined,
      });
    } catch (_error) {
      this.logger.error(
        `Failed to update message read count: messageId=${messageId}`,
        _error,
      );
    }
  }

  /**
   * 사용자가 접근할 수 있는 Planet 목록 조회
   */
  private async getAccessiblePlanets(userId: number): Promise<any[]> {
    // GROUP Planet들 (Travel 멤버)
    const groupPlanets = await MessageReadReceipt.getRepository()
      .manager.createQueryBuilder()
      .select('planet')
      .from('planets', 'planet')
      .innerJoin('travels', 'travel', 'planet.travelId = travel.id')
      .innerJoin(
        'travel_users',
        'travelUser',
        'travel.id = travelUser.travelId',
      )
      .where('planet.type = :groupType', { groupType: PlanetType.GROUP })
      .andWhere('planet.status = :status', { status: PlanetStatus.ACTIVE })
      .andWhere('travelUser.userId = :userId', { userId })
      .andWhere('travelUser.status = :status', {
        status: TravelUserStatus.ACTIVE,
      })
      .getMany();

    // DIRECT Planet들 (직접 참여)
    const directPlanets = await MessageReadReceipt.getRepository()
      .manager.createQueryBuilder()
      .select('planet')
      .from('planets', 'planet')
      .innerJoin(
        'planet_users',
        'planetUser',
        'planet.id = planetUser.planetId',
      )
      .where('planet.type = :directType', { directType: PlanetType.DIRECT })
      .andWhere('planet.status = :status', { status: PlanetStatus.ACTIVE })
      .andWhere('planetUser.userId = :userId', { userId })
      .andWhere('planetUser.status = :status', {
        status: PlanetUserStatus.ACTIVE,
      })
      .getMany();

    return [...groupPlanets, ...directPlanets];
  }

  /**
   * Planet의 모든 사용자 조회
   */
  private async getPlanetUsers(planetId: number): Promise<any[]> {
    const planet = await MessageReadReceipt.getRepository().manager.findOne(
      Planet,
      {
        where: { id: planetId },
        select: ['id', 'type', 'travelId'],
        relations: ['travel'],
      },
    );

    if (!planet) return [];

    if (planet.type === PlanetType.GROUP) {
      // GROUP Planet: Travel의 모든 멤버
      return await MessageReadReceipt.getRepository().manager.find(TravelUser, {
        where: {
          travelId: planet.travelId,
          status: TravelUserStatus.ACTIVE,
        },
        relations: ['user'],
      });
    } else {
      // DIRECT Planet: Planet의 직접 멤버
      return await MessageReadReceipt.getRepository().manager.find(PlanetUser, {
        where: {
          planetId: planet.id,
          status: PlanetUserStatus.ACTIVE,
        },
        relations: ['user'],
      });
    }
  }
}
