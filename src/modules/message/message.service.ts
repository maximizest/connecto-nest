import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Message } from './message.entity';

/**
 * Message Service - CrudService with Essential Business Logic
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공되며, 고유한 비즈니스 로직만 보존합니다.
 * 일반적인 메시지 조회/생성은 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: Message.findByPlanet(id), Message.createMessage(data), Message.searchMessages(query)
 */
@Injectable()
export class MessageService extends CrudService<Message> {
  constructor(
    @InjectRepository(Message)
    repository: Repository<Message>,
  ) {
    super(repository);
  }

  /**
   * 메시지 조회 시 count 필드를 계산하여 추가
   */
  async findWithCounts(messageId: number): Promise<Message | null> {
    const repository = Message.getRepository();
    const message = await repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.planet', 'planet')
      .leftJoinAndSelect('message.replyToMessage', 'replyToMessage')
      .loadRelationCountAndMap('message.readCount', 'message.readReceipts')
      .loadRelationCountAndMap('message.replyCount', 'message.replies')
      .where('message.id = :messageId', { messageId })
      .getOne();

    return message;
  }

  /**
   * 메시지 목록 조회 시 count 필드를 계산하여 추가
   */
  async findManyWithCounts(
    planetId: number,
    limit: number = 50,
  ): Promise<Message[]> {
    const repository = Message.getRepository();
    const messages = await repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyToMessage', 'replyToMessage')
      .loadRelationCountAndMap('message.readCount', 'message.readReceipts')
      .loadRelationCountAndMap('message.replyCount', 'message.replies')
      .where('message.planetId = :planetId', { planetId })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return messages;
  }
}
