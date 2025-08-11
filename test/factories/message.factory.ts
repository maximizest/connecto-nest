import { Factory } from 'fishery';
import {
  Message,
  MessageStatus,
  MessageType,
} from '../../src/modules/message/message.entity';

/**
 * Message Factory - Fishery를 사용한 메시지 테스트 데이터 생성
 * 주의: planetId, senderId 필드는 별도로 설정해야 합니다
 */
export const MessageFactory = Factory.define<Message>(({ sequence }) => {
  const message = new Message();

  // 기본 정보
  message.type = MessageType.TEXT;
  message.planetId = 1; // 기본값, 실제 테스트에서는 실제 Planet ID로 설정
  message.senderId = 1; // 기본값, 실제 테스트에서는 실제 사용자 ID로 설정

  // 메시지 내용
  message.content = `테스트 메시지 ${sequence} 내용입니다.`;

  // 파일 관련 정보
  message.fileMetadata = undefined;

  // 시스템 메시지 정보
  message.systemMetadata = undefined;

  // 메시지 상태
  message.status = MessageStatus.SENT;
  message.isDeleted = false;
  message.deletedAt = undefined;
  message.deletedBy = undefined;

  // 메시지 편집
  message.isEdited = false;
  message.editedAt = undefined;
  message.originalContent = undefined;

  // 답장 및 스레드
  message.replyToMessageId = undefined;
  message.replyCount = 0;

  // 읽음 상태
  message.readCount = 0;
  message.firstReadAt = undefined;

  // 반응 (이모지)
  message.reactions = undefined;

  // 검색 최적화
  message.searchableText = message.content?.toLowerCase();

  // 메타데이터
  message.metadata = undefined;

  // 타임스탬프
  message.createdAt = new Date();
  message.updatedAt = new Date();

  return message;
});
