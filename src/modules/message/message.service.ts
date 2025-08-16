import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

/**
 * Message 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 *
 * 커스텀 비즈니스 로직은 컨트롤러의 lifecycle hooks에서 처리됩니다.
 */
@Injectable()
export class MessageService extends CrudService<Message> {
  public readonly repository: Repository<Message>;

  constructor(
    @InjectRepository(Message)
    repository: Repository<Message>,
  ) {
    super(repository);
    this.repository = repository;
  }

  /**
   * 메시지 조회 시 count 필드를 계산하여 추가
   */
  async findWithCounts(messageId: number): Promise<Message | null> {
    const message = await this.repository
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
  async findManyWithCounts(planetId: number, limit: number = 50): Promise<Message[]> {
    const messages = await this.repository
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