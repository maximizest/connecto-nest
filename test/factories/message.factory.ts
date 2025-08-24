import { Factory } from 'fishery';
import { Message } from '../../src/modules/message/message.entity';
import { MessageStatus } from '../../src/modules/message/enums/message-status.enum';
import { MessageType } from '../../src/modules/message/enums/message-type.enum';

/**
 * Message Factory - Fishery를 사용한 메시지 테스트 데이터 생성
 */
export const MessageFactory = Factory.define<Message>(({ sequence, params }) => {
  const message = new Message();

  // 기본 정보
  message.id = sequence;
  message.type = MessageType.TEXT;
  message.planetId = params.planetId || sequence;
  message.senderId = params.senderId || sequence;

  // 메시지 내용
  message.content = `테스트 메시지 ${sequence} 내용입니다.`;

  // 파일 관련 정보
  message.fileMetadata = null;

  // 시스템 메시지 정보
  message.systemMetadata = null;

  // 메시지 상태
  message.status = MessageStatus.SENT;
  message.deletedAt = null;
  message.deletedBy = null;

  // 메시지 편집
  message.isEdited = false;
  message.editedAt = null;
  message.originalContent = null;

  // 답장 및 스레드
  message.replyToMessageId = null;
  message.replyCount = 0;

  // 읽음 상태
  message.readCount = 0;
  message.firstReadAt = null;

  // 반응 (이모지)
  message.reactions = null;

  // 검색 최적화
  message.searchableText = message.content?.toLowerCase();

  // 메타데이터
  message.metadata = null;

  // 타임스탬프
  message.createdAt = new Date();
  message.updatedAt = new Date();

  return message;
});

/**
 * 이미지 메시지 Factory
 */
export const ImageMessageFactory = MessageFactory.params({
  type: MessageType.IMAGE,
  content: null,
  fileMetadata: {
    fileUploadId: 1,
    fileName: 'test-image.jpg',
    fileSize: 1024 * 1024 * 2, // 2MB
    mimeType: 'image/jpeg',
    url: 'https://cdn.example.com/images/test.jpg',
    thumbnailUrl: 'https://cdn.example.com/images/test_thumb.jpg',
    width: 1920,
    height: 1080,
  },
});

/**
 * 비디오 메시지 Factory
 */
export const VideoMessageFactory = MessageFactory.params({
  type: MessageType.VIDEO,
  content: null,
  fileMetadata: {
    fileUploadId: 2,
    fileName: 'test-video.mp4',
    fileSize: 1024 * 1024 * 50, // 50MB
    mimeType: 'video/mp4',
    url: 'https://cdn.example.com/videos/test.mp4',
    thumbnailUrl: 'https://cdn.example.com/videos/test_thumb.jpg',
    duration: 120,
    width: 1920,
    height: 1080,
  },
});

/**
 * 파일 메시지 Factory
 */
export const FileMessageFactory = MessageFactory.params({
  type: MessageType.FILE,
  content: null,
  fileMetadata: {
    fileUploadId: 3,
    fileName: 'document.pdf',
    fileSize: 1024 * 1024 * 5, // 5MB
    mimeType: 'application/pdf',
    url: 'https://cdn.example.com/files/document.pdf',
  },
});

/**
 * 시스템 메시지 Factory
 */
export const SystemMessageFactory = MessageFactory.params({
  type: MessageType.SYSTEM,
  senderId: null,
  content: '새로운 멤버가 참여했습니다.',
  systemMetadata: {
    eventType: 'user_joined',
    affectedUserId: 1,
    affectedUserName: '새로운 사용자',
  },
});

/**
 * 편집된 메시지 Factory
 */
export const EditedMessageFactory = MessageFactory.params({
  isEdited: true,
  editedAt: new Date(),
  originalContent: '원본 메시지 내용',
  content: '수정된 메시지 내용',
});

/**
 * 삭제된 메시지 Factory
 */
export const DeletedMessageFactory = MessageFactory.params({
  status: MessageStatus.DELETED,
  deletedAt: new Date(),
  deletedBy: 1,
  content: null,
});

/**
 * 답장 메시지 Factory
 */
export const ReplyMessageFactory = MessageFactory.params({
  replyToMessageId: 1,
  content: '이전 메시지에 대한 답장입니다.',
});
