import { Injectable } from '@nestjs/common';
import { Message } from './message.entity';
import { MessageType } from './enums/message-type.enum';
import { FileMetadata } from './types/file-metadata.interface';
import { SystemMessageMetadata } from './types/system-message-metadata.interface';

/**
 * Message Service - Active Record Pattern
 * 
 * Repository 주입 없이 Message 엔티티의 Active Record 메서드를 활용합니다.
 */
@Injectable()
export class MessageService {

  /**
   * ID로 메시지 조회
   */
  async findById(id: number) {
    return Message.findById(id);
  }

  /**
   * Planet의 메시지 조회
   */
  async findByPlanet(planetId: number, limit?: number) {
    return Message.findByPlanet(planetId, limit);
  }

  /**
   * 사용자의 메시지 조회
   */
  async findBySender(senderId: number) {
    return Message.findBySender(senderId);
  }

  /**
   * 메시지 타입별 조회
   */
  async findByType(type: MessageType) {
    return Message.findByType(type);
  }

  /**
   * 메시지 검색
   */
  async searchMessages(query: string, planetId?: number) {
    return Message.searchMessages(query, planetId);
  }

  /**
   * 읽지 않은 메시지 수 조회
   */
  async countUnreadByPlanet(planetId: number, userId: number) {
    return Message.countUnreadByPlanet(planetId, userId);
  }

  /**
   * 답장 메시지들 조회
   */
  async findReplies(messageId: number) {
    return Message.findReplies(messageId);
  }

  /**
   * 메시지 생성
   */
  async createMessage(messageData: {
    type: MessageType;
    planetId: number;
    senderId?: number;
    content?: string;
    fileMetadata?: FileMetadata;
    systemMetadata?: SystemMessageMetadata;
    replyToMessageId?: number;
    metadata?: any;
  }) {
    return Message.createMessage(messageData);
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

  /**
   * 메시지 업데이트
   */
  async updateMessage(id: number, updateData: Partial<Message>) {
    await Message.update(id, updateData);
    return Message.findById(id);
  }

  /**
   * 메시지 삭제
   */
  async deleteMessage(id: number) {
    const message = await Message.findById(id);
    if (message) {
      return message.remove();
    }
    return null;
  }

  /**
   * 사용자 탈퇴 시 메시지 익명화
   */
  async anonymizeUserMessages(userId: number, userType: 'user' | 'admin') {
    return Message.anonymizeUserMessages(userId, userType);
  }

  /**
   * Planet 삭제 시 관련 메시지 정리
   */
  async cleanupByPlanet(planetId: number) {
    return Message.cleanupByPlanet(planetId);
  }

  /**
   * 오래된 메시지 정리
   */
  async cleanupOldMessages(daysOld: number) {
    return Message.cleanupOldMessages(daysOld);
  }
}
