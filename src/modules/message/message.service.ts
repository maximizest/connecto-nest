import { Injectable } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Message } from './message.entity';

/**
 * Message Service - Active Record Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 */
@Injectable()
export class MessageService extends CrudService<Message> {
  constructor() {
    super(Message.getRepository());
  }

  /**
   * PostgreSQL 전문 검색을 사용한 메시지 검색
   * @param planetId 행성 ID
   * @param searchQuery 검색어
   * @param limit 결과 제한
   * @param offset 오프셋
   */
  async searchMessagesWithFTS(
    planetId: number,
    searchQuery: string,
    limit = 20,
    offset = 0,
  ): Promise<{ messages: Message[]; total: number }> {
    const queryBuilder = Message.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyToMessage', 'replyTo')
      .where('message.planetId = :planetId', { planetId })
      .andWhere('message.deletedAt IS NULL');

    // PostgreSQL 전문 검색 사용
    if (searchQuery && searchQuery.trim()) {
      // 영어 전문 검색
      queryBuilder.andWhere(
        `to_tsvector('english', COALESCE(message.content, '') || ' ' || COALESCE(message.searchableText, '')) 
         @@ plainto_tsquery('english', :query)`,
        { query: searchQuery },
      );

      // 또는 한국어/다국어 trigram 검색 (더 느리지만 더 유연함)
      // queryBuilder.andWhere(
      //   `(COALESCE(message.content, '') || ' ' || COALESCE(message.searchableText, '')) 
      //    ILIKE :pattern`,
      //   { pattern: `%${searchQuery}%` },
      // );
    }

    queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return { messages, total };
  }

  /**
   * Trigram 기반 유사도 검색 (한국어 지원)
   * @param planetId 행성 ID
   * @param searchQuery 검색어
   * @param similarityThreshold 유사도 임계값 (0-1)
   * @param limit 결과 제한
   */
  async searchMessagesWithSimilarity(
    planetId: number,
    searchQuery: string,
    similarityThreshold = 0.3,
    limit = 20,
  ): Promise<Message[]> {
    if (!searchQuery || !searchQuery.trim()) {
      return [];
    }

    const messages = await Message.createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyToMessage', 'replyTo')
      .where('message.planetId = :planetId', { planetId })
      .andWhere('message.deletedAt IS NULL')
      .andWhere(
        `similarity(
          COALESCE(message.content, '') || ' ' || COALESCE(message.searchableText, ''),
          :query
        ) > :threshold`,
        { query: searchQuery, threshold: similarityThreshold },
      )
      .orderBy(
        `similarity(
          COALESCE(message.content, '') || ' ' || COALESCE(message.searchableText, ''),
          :query
        )`,
        'DESC',
      )
      .setParameter('query', searchQuery)
      .take(limit)
      .getMany();

    return messages;
  }
}
