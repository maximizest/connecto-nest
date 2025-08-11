import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CHAT_CONSTANTS } from '../../common/constants/app.constants';
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';

/**
 * 메시지 타입
 */
export enum MessageType {
  TEXT = 'text', // 텍스트
  IMAGE = 'image', // 이미지
  VIDEO = 'video', // 비디오
  FILE = 'file', // 파일
  SYSTEM = 'system', // 시스템 메시지
}

/**
 * 메시지 상태
 */
export enum MessageStatus {
  SENT = 'sent', // 전송됨
  DELIVERED = 'delivered', // 전달됨
  READ = 'read', // 읽음
  FAILED = 'failed', // 전송 실패
  DELETED = 'deleted', // 삭제됨
}

/**
 * 파일 메타데이터 인터페이스
 */
interface FileMetadata {
  originalName: string; // 원본 파일명
  fileName: string; // 저장된 파일명
  fileSize: number; // 파일 크기 (bytes)
  mimeType: string; // MIME 타입
  extension: string; // 파일 확장자
  storageKey: string; // 스토리지 키
  url: string; // 접근 URL
  thumbnailUrl?: string; // 썸네일 URL (이미지/비디오)
  width?: number; // 이미지/비디오 너비
  height?: number; // 이미지/비디오 높이
  duration?: number; // 비디오 재생 시간 (초)
  checksum?: string; // 파일 체크섬
}

/**
 * 시스템 메시지 메타데이터
 */
interface SystemMessageMetadata {
  action: string; // 액션 타입 (join, leave, ban, etc.)
  userId?: number; // 대상 사용자 ID
  oldValue?: any; // 변경 전 값
  newValue?: any; // 변경 후 값
  reason?: string; // 사유
}

@Entity('messages')
@Index(['planetId']) // Planet별 조회 최적화
@Index(['senderId']) // 발신자별 조회
@Index(['type']) // 타입별 필터링
@Index(['status']) // 상태별 필터링
@Index(['createdAt']) // 시간순 정렬 최적화
@Index(['planetId', 'createdAt']) // Planet 내 시간순 조회 (복합 인덱스)
@Index(['senderId', 'createdAt']) // 사용자별 시간순 조회
@Index(['isDeleted']) // 삭제되지 않은 메시지 필터링
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({
    type: 'enum',
    enum: MessageType,
    comment: '메시지 타입',
  })
  @IsEnum(MessageType)
  @Index()
  type: MessageType;

  @Column({ comment: '소속 Planet ID' })
  @IsNumber()
  @Index()
  planetId: number;

  @ManyToOne(() => Planet, { eager: false })
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  @Column({ comment: '메시지 발신자 ID' })
  @IsNumber()
  @Index()
  senderId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  /**
   * 메시지 내용
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: '메시지 내용 (텍스트)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CHAT_CONSTANTS.MAX_MESSAGE_LENGTH)
  content?: string;

  /**
   * 파일 관련 정보
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '파일 메타데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  fileMetadata?: FileMetadata;

  /**
   * 시스템 메시지 정보
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '시스템 메시지 메타데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  systemMetadata?: SystemMessageMetadata;

  /**
   * 메시지 상태
   */
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
    comment: '메시지 상태',
  })
  @IsEnum(MessageStatus)
  status: MessageStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: '삭제 여부 (소프트 삭제)',
  })
  @IsBoolean()
  @Index()
  isDeleted: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '삭제 시간',
  })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: '삭제한 사용자 ID',
  })
  @IsOptional()
  @IsNumber()
  deletedBy?: number;

  /**
   * 메시지 편집
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '편집 여부',
  })
  @IsBoolean()
  isEdited: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 편집 시간',
  })
  @IsOptional()
  @IsDateString()
  editedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '편집 전 원본 내용',
  })
  @IsOptional()
  @IsString()
  originalContent?: string;

  /**
   * 답장 및 스레드
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '답장 대상 메시지 ID',
  })
  @IsOptional()
  @IsNumber()
  @Index()
  replyToMessageId?: number;

  @ManyToOne(() => Message, { eager: false })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage?: Message;

  @Column({
    type: 'int',
    default: 0,
    comment: '답장 메시지 개수',
  })
  @IsNumber()
  replyCount: number;

  /**
   * 읽음 상태
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '읽음 확인한 사용자 수',
  })
  @IsNumber()
  readCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '첫 읽음 시간',
  })
  @IsOptional()
  @IsDateString()
  firstReadAt?: Date;

  /**
   * 반응 (이모지)
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '메시지 반응 정보 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  reactions?: Record<string, number[]>; // { "👍": [userId1, userId2], "❤️": [userId3] }

  /**
   * 검색 최적화
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: '검색용 텍스트 (인덱싱용)',
  })
  @IsOptional()
  @IsString()
  searchableText?: string;

  /**
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '추가 메타데이터 (JSON)',
  })
  @IsOptional()
  metadata?: {
    clientMessageId?: string; // 클라이언트 임시 ID
    mentions?: number[]; // 멘션된 사용자 ID들
    hashtags?: string[]; // 해시태그
    links?: string[]; // 링크 URL들
    ipAddress?: string; // 발신자 IP (관리용)
    userAgent?: string; // 클라이언트 정보
    location?: {
      // 위치 정보 (선택사항)
      latitude: number;
      longitude: number;
      address?: string;
    };
    priority?: 'low' | 'normal' | 'high'; // 메시지 우선순위
  };

  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: '메시지 전송 시간' })
  @IsOptional()
  @IsDateString()
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ comment: '메시지 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 텍스트 메시지인지 확인
   */
  isTextMessage(): boolean {
    return this.type === MessageType.TEXT;
  }

  /**
   * 파일 메시지인지 확인
   */
  isFileMessage(): boolean {
    return [MessageType.IMAGE, MessageType.VIDEO, MessageType.FILE].includes(
      this.type,
    );
  }

  /**
   * 시스템 메시지인지 확인
   */
  isSystemMessage(): boolean {
    return this.type === MessageType.SYSTEM;
  }

  /**
   * 이미지 메시지인지 확인
   */
  isImageMessage(): boolean {
    return this.type === MessageType.IMAGE;
  }

  /**
   * 비디오 메시지인지 확인
   */
  isVideoMessage(): boolean {
    return this.type === MessageType.VIDEO;
  }

  /**
   * 삭제 가능한지 확인 (발신자 또는 관리자)
   */
  canDelete(userId: number, isAdmin: boolean = false): boolean {
    return !this.isDeleted && (this.senderId === userId || isAdmin);
  }

  /**
   * 편집 가능한지 확인 (텍스트 메시지만, 발신자만, 시간 제한)
   */
  canEdit(userId: number, timeLimit: number = 900000): boolean {
    // 15분 기본
    if (this.isDeleted || this.senderId !== userId || !this.isTextMessage()) {
      return false;
    }

    const editTimeLimit = Date.now() - this.createdAt.getTime();
    return editTimeLimit <= timeLimit;
  }

  /**
   * 메시지 소프트 삭제
   */
  softDelete(deletedBy: number): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.content = undefined; // 내용 제거
    this.fileMetadata = undefined; // 파일 정보 제거
  }

  /**
   * 메시지 편집
   */
  edit(newContent: string): void {
    if (!this.isEdited) {
      this.originalContent = this.content; // 원본 보존
    }

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    this.updateSearchableText();
  }

  /**
   * 검색용 텍스트 업데이트
   */
  updateSearchableText(): void {
    let searchText = '';

    if (this.content) {
      searchText += this.content + ' ';
    }

    if (this.fileMetadata && this.fileMetadata.originalName) {
      searchText += this.fileMetadata.originalName + ' ';
    }

    if (this.systemMetadata && this.systemMetadata.reason) {
      searchText += this.systemMetadata.reason + ' ';
    }

    this.searchableText = searchText.trim().toLowerCase();
  }

  /**
   * 반응 추가
   */
  addReaction(emoji: string, userId: number): void {
    if (!this.reactions) {
      this.reactions = {};
    }

    if (!this.reactions[emoji]) {
      this.reactions[emoji] = [];
    }

    if (!this.reactions[emoji].includes(userId)) {
      this.reactions[emoji].push(userId);
    }
  }

  /**
   * 반응 제거
   */
  removeReaction(emoji: string, userId: number): void {
    if (!this.reactions || !this.reactions[emoji]) {
      return;
    }

    const index = this.reactions[emoji].indexOf(userId);
    if (index > -1) {
      this.reactions[emoji].splice(index, 1);

      // 빈 배열이면 제거
      if (this.reactions[emoji].length === 0) {
        delete this.reactions[emoji];
      }
    }
  }

  /**
   * 읽음 상태 업데이트
   */
  markAsRead(): void {
    if (this.readCount === 0) {
      this.firstReadAt = new Date();
    }
    this.readCount += 1;
    this.status = MessageStatus.READ;
  }

  /**
   * 답장 수 증가
   */
  incrementReplyCount(): void {
    this.replyCount += 1;
  }

  /**
   * 파일 크기를 사람이 읽기 쉬운 형태로 변환
   */
  getHumanReadableFileSize(): string {
    if (!this.fileMetadata) return '';

    const size = this.fileMetadata.fileSize;
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 메시지 미리보기 생성 (검색/알림용)
   */
  getPreview(maxLength: number = 100): string {
    switch (this.type) {
      case MessageType.TEXT:
        return this.content && this.content.length > maxLength
          ? this.content.substring(0, maxLength) + '...'
          : this.content || '';

      case MessageType.IMAGE:
        return '📷 이미지';

      case MessageType.VIDEO:
        return '🎥 비디오';

      case MessageType.FILE:
        return `📎 ${this.fileMetadata?.originalName || '파일'}`;

      case MessageType.SYSTEM:
        return `🔔 ${this.systemMetadata?.action || '시스템 메시지'}`;

      default:
        return '메시지';
    }
  }

  /**
   * 답장인지 확인
   */
  isReply(): boolean {
    return !!this.replyToMessageId;
  }

  /**
   * 멘션이 포함되어 있는지 확인
   */
  hasMentions(): boolean {
    return !!(this.metadata?.mentions && this.metadata.mentions.length > 0);
  }

  /**
   * 특정 사용자가 멘션되었는지 확인
   */
  isUserMentioned(userId: number): boolean {
    return !!(
      this.metadata?.mentions && this.metadata.mentions.includes(userId)
    );
  }
}
