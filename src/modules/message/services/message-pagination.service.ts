import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import {
  CursorPaginationResponseDto,
  MessagePaginationMeta,
  MessagePaginationQueryDto,
  SearchPaginationResponseDto,
} from '../../../common/dto/pagination.dto';
import { RedisService } from '../../cache/redis.service';
import { Message, MessageType } from '../message.entity';
import { CursorData } from '../types/cursor-data.interface';

/**
 * 메시지 최적화 페이지네이션 서비스
 *
 * 대용량 메시지 데이터를 효율적으로 처리합니다:
 * - 커서 기반 페이지네이션 (무한 스크롤)
 * - 인덱스 최적화된 쿼리
 * - Redis 캐싱
 * - 실시간 업데이트 지원
 */
@Injectable()
export class MessagePaginationService {
  private readonly logger = new Logger(MessagePaginationService.name);
  private readonly CACHE_PREFIX = 'message_pagination';
  private readonly CACHE_TTL = 5 * 60; // 5분

  constructor(private readonly redisService: RedisService) {}

  /**
   * Planet 메시지 목록 조회 (커서 기반)
   */
  async getPlanetMessages(
    planetId: number,
    query: MessagePaginationQueryDto,
    userId: number,
  ): Promise<CursorPaginationResponseDto<any>> {
    const cacheKey = this.buildCacheKey('planet_messages', planetId, query);

    try {
      // 캐시된 결과 확인
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for planet messages: ${planetId}`);
        return cached;
      }

      // 쿼리 빌더 생성
      const queryBuilder = this.createBaseQueryBuilder();

      // Planet 필터링
      queryBuilder.andWhere('message.planetId = :planetId', { planetId });

      // 삭제된 메시지 필터링
      if (!query.includeDeleted) {
        queryBuilder.andWhere('message.isDeleted = false');
      }

      // 시스템 메시지 필터링
      if (!query.includeSystem) {
        queryBuilder.andWhere('message.type != :systemType', {
          systemType: MessageType.SYSTEM,
        });
      }

      // 커서 기반 페이지네이션 적용
      this.applyCursorPagination(queryBuilder, query);

      // 정렬 및 제한
      this.applySorting(
        queryBuilder,
        query.sortField || 'createdAt',
        query.direction || 'desc',
      );
      queryBuilder.limit(query.limit || 20);

      // 쿼리 실행
      const messages = await queryBuilder.getMany();

      // 다음 커서 생성
      const nextCursor = this.generateNextCursor(messages, query);
      const prevCursor = this.generatePrevCursor(messages, query);

      // 응답 생성
      const response = new CursorPaginationResponseDto(
        this.formatMessages(messages),
        nextCursor,
        prevCursor,
        query.limit || 20,
      );

      // 결과 캐싱 (짧은 TTL)
      await this.cacheResult(cacheKey, response, 60); // 1분

      return response;
    } catch (error) {
      this.logger.error(
        `Error fetching planet messages: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 메시지 검색 (페이지네이션 포함)
   */
  async searchMessages(
    planetId: number,
    searchQuery: string,
    query: MessagePaginationQueryDto,
    userId: number,
  ): Promise<SearchPaginationResponseDto<any>> {
    const startTime = Date.now();

    try {
      const queryBuilder = this.createBaseQueryBuilder();

      // Planet 필터링
      queryBuilder.andWhere('message.planetId = :planetId', { planetId });

      // 전문 검색
      queryBuilder.andWhere(
        "to_tsvector('korean', message.searchableText) @@ plainto_tsquery('korean', :searchQuery)",
        { searchQuery },
      );

      // 삭제된 메시지 제외
      queryBuilder.andWhere('message.isDeleted = false');

      // 커서 페이지네이션 적용
      this.applyCursorPagination(queryBuilder, query);

      // 관련성 점수 순으로 정렬
      queryBuilder
        .addSelect(
          "ts_rank(to_tsvector('korean', message.searchableText), plainto_tsquery('korean', :searchQuery))",
          'relevance_score',
        )
        .orderBy('relevance_score', 'DESC')
        .addOrderBy('message.createdAt', 'DESC');

      queryBuilder.limit(query.limit || 20);

      // 쿼리 실행
      const messages = await queryBuilder.getRawAndEntities();
      const searchTime = Date.now() - startTime;

      // 커서 생성
      const nextCursor = this.generateNextCursor(messages.entities, query);
      const prevCursor = this.generatePrevCursor(messages.entities, query);

      // 검색 메타데이터
      const searchMeta = {
        query: searchQuery,
        filters: {
          planetId,
          includeDeleted: query.includeDeleted,
          includeSystem: query.includeSystem,
        },
        searchTime,
        totalMatches: messages.entities.length, // 정확한 total은 별도 쿼리 필요
      };

      return new SearchPaginationResponseDto(
        this.formatMessages(messages.entities),
        searchMeta,
        nextCursor,
        prevCursor,
        query.limit || 20,
      );
    } catch (error) {
      this.logger.error(
        `Error searching messages: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 특정 메시지 주변 컨텍스트 조회
   * (특정 메시지로 점프할 때 사용)
   */
  async getMessageContext(
    messageId: number,
    planetId: number,
    contextSize: number = 10,
    userId: number,
  ): Promise<CursorPaginationResponseDto<any>> {
    try {
      // 기준 메시지 조회
      const targetMessage = await Message.findOne({
        where: { id: messageId, planetId },
      });

      if (!targetMessage) {
        throw new Error('Target message not found');
      }

      const queryBuilder = this.createBaseQueryBuilder();

      // Planet 및 날짜 범위 필터링
      queryBuilder
        .andWhere('message.planetId = :planetId', { planetId })
        .andWhere('message.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(
            targetMessage.createdAt.getTime() - 24 * 60 * 60 * 1000,
          ), // 1일 전
          endDate: new Date(
            targetMessage.createdAt.getTime() + 24 * 60 * 60 * 1000,
          ), // 1일 후
        })
        .andWhere('message.isDeleted = false')
        .orderBy('message.createdAt', 'ASC')
        .limit(contextSize * 2 + 1); // 전후 메시지 + 기준 메시지

      const messages = await queryBuilder.getMany();

      // 기준 메시지를 중심으로 정렬
      const targetIndex = messages.findIndex((msg) => msg.id === messageId);
      const contextMessages = targetIndex >= 0 ? messages : [targetMessage];

      return new CursorPaginationResponseDto(
        this.formatMessages(contextMessages),
        undefined, // 컨텍스트 조회에서는 커서 없음
        undefined,
        contextMessages.length,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching message context: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Planet 메시지 통계 조회
   */
  async getPlanetMessageStats(
    planetId: number,
    userId: number,
  ): Promise<MessagePaginationMeta> {
    const cacheKey = `${this.CACHE_PREFIX}:stats:${planetId}`;

    try {
      // 캐시된 통계 확인
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 통계 쿼리
      const stats = await Message.createQueryBuilder('message')
        .select([
          'COUNT(*) as totalMessages',
          'MIN(message.createdAt) as oldestMessageDate',
          'MAX(message.createdAt) as newestMessageDate',
          'array_agg(DISTINCT message.type) as messageTypes',
        ])
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.isDeleted = false')
        .getRawOne();

      // 읽지 않은 메시지 수 조회 (별도 쿼리)
      const unreadCount = await Message.createQueryBuilder('message')
        .leftJoin(
          'message_read_receipts',
          'receipt',
          'receipt.messageId = message.id AND receipt.userId = :userId',
          { userId },
        )
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.isDeleted = false')
        .andWhere('message.senderId != :userId', { userId }) // 본인 메시지 제외
        .andWhere('(receipt.isRead IS NULL OR receipt.isRead = false)')
        .getCount();

      const meta = new MessagePaginationMeta(planetId, {
        totalMessages: parseInt(stats.totalMessages),
        unreadCount,
        oldestMessageDate: stats.oldestMessageDate,
        newestMessageDate: stats.newestMessageDate,
        messageTypes: stats.messageTypes,
      });

      // 통계 캐싱 (긴 TTL)
      await this.redisService.set(
        cacheKey,
        JSON.stringify(meta),
        this.CACHE_TTL,
      );

      return meta;
    } catch (error) {
      this.logger.error(
        `Error fetching message stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 기본 쿼리 빌더 생성
   */
  private createBaseQueryBuilder(): SelectQueryBuilder<Message> {
    return Message.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.planet', 'planet')
      .select([
        'message.id',
        'message.type',
        'message.content',
        'message.fileMetadata',
        'message.status',
        'message.createdAt',
        'message.updatedAt',
        'message.editedAt',
        'message.isEdited',
        'message.isDeleted',
        'message.replyCount',
        'message.readCount',
        'sender.id',
        'sender.name',
        'planet.id',
        'planet.name',
        'planet.type',
      ]);
  }

  /**
   * 커서 기반 페이지네이션 적용
   */
  private applyCursorPagination(
    queryBuilder: SelectQueryBuilder<Message>,
    query: MessagePaginationQueryDto,
  ): void {
    if (query.cursor) {
      try {
        const cursorData: CursorData = JSON.parse(
          Buffer.from(query.cursor, 'base64').toString('utf-8'),
        );

        const direction = query.direction || 'desc';
        const operator = direction === 'desc' ? '<' : '>';
        const field = query.sortField || 'createdAt';

        if (field === 'createdAt') {
          queryBuilder.andWhere(
            `message.createdAt ${operator} :cursorDate OR (message.createdAt = :cursorDate AND message.id ${operator} :cursorId)`,
            {
              cursorDate: cursorData.createdAt,
              cursorId: cursorData.id,
            },
          );
        } else {
          // 다른 필드 기반 커서
          queryBuilder.andWhere(`message.${field} ${operator} :cursorValue`, {
            cursorValue: cursorData[field as keyof CursorData],
          });
        }
      } catch (error) {
        this.logger.warn(`Invalid cursor format: ${query.cursor}`);
      }
    }

    // 날짜 범위 필터
    if (query.beforeDate) {
      queryBuilder.andWhere('message.createdAt < :beforeDate', {
        beforeDate: new Date(query.beforeDate),
      });
    }

    if (query.afterDate) {
      queryBuilder.andWhere('message.createdAt > :afterDate', {
        afterDate: new Date(query.afterDate),
      });
    }

    // 메시지 ID 범위 필터
    if (query.beforeMessageId) {
      queryBuilder.andWhere('message.id < :beforeMessageId', {
        beforeMessageId: query.beforeMessageId,
      });
    }

    if (query.afterMessageId) {
      queryBuilder.andWhere('message.id > :afterMessageId', {
        afterMessageId: query.afterMessageId,
      });
    }
  }

  /**
   * 정렬 적용
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Message>,
    sortField: string,
    direction: 'asc' | 'desc',
  ): void {
    queryBuilder.orderBy(
      `message.${sortField}`,
      direction.toUpperCase() as 'ASC' | 'DESC',
    );

    // 일관된 정렬을 위해 ID로 2차 정렬
    if (sortField !== 'id') {
      queryBuilder.addOrderBy(
        'message.id',
        direction.toUpperCase() as 'ASC' | 'DESC',
      );
    }
  }

  /**
   * 다음 커서 생성
   */
  private generateNextCursor(
    messages: Message[],
    query: MessagePaginationQueryDto,
  ): string | undefined {
    if (messages.length === 0 || messages.length < (query.limit || 20)) {
      return undefined; // 더 이상 데이터 없음
    }

    const lastMessage = messages[messages.length - 1];
    const cursorData: CursorData = {
      id: lastMessage.id,
      createdAt: lastMessage.createdAt,
    };

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * 이전 커서 생성
   */
  private generatePrevCursor(
    messages: Message[],
    query: MessagePaginationQueryDto,
  ): string | undefined {
    if (messages.length === 0 || !query.cursor) {
      return undefined;
    }

    const firstMessage = messages[0];
    const cursorData: CursorData = {
      id: firstMessage.id,
      createdAt: firstMessage.createdAt,
    };

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * 메시지 포맷팅
   */
  private formatMessages(messages: Message[]): any[] {
    return messages.map((message) => ({
      id: message.id,
      type: message.type,
      content: message.content,
      fileMetadata: message.fileMetadata,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      editedAt: message.editedAt,
      isEdited: message.isEdited,
      deletedAt: message.deletedAt,
      replyCount: message.replyCount || 0,
      readCount: message.readCount || 0,
      sender: message.sender
        ? {
            id: message.sender.id,
            name: message.sender.name,
          }
        : null,
      planet: message.planet
        ? {
            id: message.planet.id,
            name: message.planet.name,
            type: message.planet.type,
          }
        : null,
      preview: message.getPreview
        ? message.getPreview(150)
        : message.content?.substring(0, 150),
    }));
  }

  /**
   * 캐시 키 생성
   */
  private buildCacheKey(prefix: string, planetId: number, query: any): string {
    const queryHash = Buffer.from(JSON.stringify(query))
      .toString('base64')
      .substring(0, 16);
    return `${this.CACHE_PREFIX}:${prefix}:${planetId}:${queryHash}`;
  }

  /**
   * 캐시된 결과 조회
   */
  private async getCachedResult(key: string): Promise<any | null> {
    try {
      const cached = await this.redisService.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Cache read error: ${error.message}`);
      return null;
    }
  }

  /**
   * 결과 캐싱
   */
  private async cacheResult(
    key: string,
    data: any,
    ttl?: number,
  ): Promise<void> {
    try {
      await this.redisService.set(
        key,
        JSON.stringify(data),
        ttl || this.CACHE_TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache write error: ${error.message}`);
    }
  }

  /**
   * Planet 메시지 캐시 무효화
   */
  async invalidatePlanetCache(planetId: number): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:*:${planetId}:*`;
      const keys = await this.redisService.getKeys(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redisService.del(key)));
        this.logger.debug(
          `Invalidated ${keys.length} cache entries for planet ${planetId}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Cache invalidation error: ${error.message}`);
    }
  }
}
