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
  BeforeInsert,
  BeforeUpdate,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { CHAT_CONSTANTS } from '../../common/constants/app.constants';
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';
import { FileMetadata } from './types/file-metadata.interface';
import { SystemMessageMetadata } from './types/system-message-metadata.interface';
import { MessageType } from './enums/message-type.enum';
import { MessageStatus } from './enums/message-status.enum';
import { SanitizationUtil } from '../../common/utils/sanitization.util';

@Entity('messages')
// 복합 인덱스 - 성능 향상
@Index(['planetId', 'createdAt']) // Planet 내 시간순 조회
@Index(['senderId', 'createdAt']) // 사용자별 시간순 조회
@Index(['planetId', 'type']) // Planet 내 타입별 조회
@Index(['planetId', 'senderId']) // Planet 내 발신자별 조회
@Index(['type', 'createdAt']) // 타입별 시간순 조회
@Index(['status', 'createdAt']) // 상태별 시간순 조회
@Index(['planetId', 'type', 'createdAt']) // Planet 내 타입별 시간순 조회
@Index(['senderId', 'type', 'createdAt']) // 사용자별 타입별 시간순 조회
export class Message extends BaseActiveRecord {
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
  @Index() // 타입별 필터링
  type: MessageType;

  @Column({ comment: '소속 Planet ID' })
  @IsNumber()
  @Index() // Planet별 조회 최적화
  planetId: number;

  @ManyToOne(() => Planet, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  @Column({ comment: '메시지 발신자 ID', nullable: true })
  @IsOptional()
  @IsNumber()
  @Index() // 발신자별 조회
  senderId?: number;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender?: User;

  /**
   * 하드 삭제 익명화 필드들
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '탈퇴한 사용자의 메시지 여부',
  })
  @IsBoolean()
  @Index() // 탈퇴한 사용자 메시지 필터링
  isFromDeletedUser: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '탈퇴한 사용자 타입 (user | admin)',
  })
  @IsOptional()
  @IsString()
  deletedUserType?: 'user' | 'admin';

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
  @Index() // 상태별 필터링
  status: MessageStatus;

  /**
   * Soft Delete 지원 (TypeORM 내장)
   */
  @DeleteDateColumn({ comment: '메시지 삭제 시간 (Soft Delete)' })
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

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '삭제 사유',
  })
  @IsOptional()
  @IsString()
  deletionReason?: string;

  /**
   * 메시지 편집
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '편집 여부',
  })
  @IsBoolean()
  @Index() // 편집된 메시지 필터링
  isEdited: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 편집 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 편집 시간 정렬
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
  @Index() // 답장 메시지 조회
  replyToMessageId?: number;

  @ManyToOne(() => Message, (message) => message.replies, { eager: false })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage?: Message;

  /**
   * 답장 메시지들 (이 메시지에 대한 답장들)
   */
  @OneToMany(() => Message, (message) => message.replyToMessage)
  replies?: Message[];

  /**
   * 읽음 확인 관계
   */
  @OneToMany('MessageReadReceipt', 'message')
  readReceipts?: any[];

  /**
   * Virtual: 읽은 수 (관계에서 계산)
   */
  readCount?: number;

  /**
   * Virtual: 답장 수 (관계에서 계산)
   */
  replyCount?: number;

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
  @Index() // 검색 최적화 (텍스트 검색)
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
   * Active Record 정적 메서드
   */

  // Simple finder methods removed - use TypeORM queries directly in controllers
  // Examples:
  // Message.find({ where: { planetId }, order: { createdAt: 'DESC' }, relations: ['sender'], take: limit })
  // Message.find({ where: { senderId }, order: { createdAt: 'DESC' } })
  // Message.find({ where: { type }, order: { createdAt: 'DESC' } })

  /**
   * Planet의 타입별 메시지 조회
   */
  static async findByPlanetAndType(
    planetId: number,
    type: MessageType,
  ): Promise<Message[]> {
    return this.find({
      where: { planetId, type },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 메시지 검색 (내용 기반)
   */
  static async searchMessages(
    query: string,
    planetId?: number,
  ): Promise<Message[]> {
    const repository = this.getRepository();
    const qb = repository
      .createQueryBuilder('message')
      .where('message.searchableText ILIKE :query', { query: `%${query}%` })
      .orderBy('message.createdAt', 'DESC');

    if (planetId) {
      qb.andWhere('message.planetId = :planetId', { planetId });
    }

    return qb.getMany();
  }

  /**
   * 읽지 않은 메시지 수 조회
   */
  static async countUnreadByPlanet(
    planetId: number,
    userId: number,
  ): Promise<number> {
    const repository = this.getRepository();
    return repository
      .createQueryBuilder('message')
      .leftJoin('message.readReceipts', 'receipt', 'receipt.userId = :userId', {
        userId,
      })
      .where('message.planetId = :planetId', { planetId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('receipt.id IS NULL')
      .getCount();
  }

  // Simple finder method removed - use TypeORM query directly:
  // Message.find({ where: { replyToMessageId: messageId }, order: { createdAt: 'ASC' }, relations: ['sender'] })

  /**
   * 메시지 생성
   */
  static async createMessage(messageData: {
    type: MessageType;
    planetId: number;
    senderId?: number;
    content?: string;
    fileMetadata?: FileMetadata;
    systemMetadata?: SystemMessageMetadata;
    replyToMessageId?: number;
    metadata?: any;
  }): Promise<Message> {
    const message = this.create({
      ...messageData,
      status: MessageStatus.SENT,
    });
    return this.save(message);
  }

  /**
   * 사용자 탈퇴 시 메시지 익명화
   */
  static async anonymizeUserMessages(
    userId: number,
    userType: 'user' | 'admin',
  ): Promise<number> {
    const result = await this.update(
      { senderId: userId },
      {
        isFromDeletedUser: true,
        deletedUserType: userType,
        senderId: undefined,
      },
    );
    return result.affected || 0;
  }

  /**
   * Planet 삭제 시 관련 메시지 정리
   */
  static async cleanupByPlanet(planetId: number): Promise<number> {
    const repository = this.getRepository();
    const result = await repository.softDelete({ planetId });
    return result.affected || 0;
  }

  /**
   * 오래된 메시지 정리 (하드 삭제)
   */
  static async cleanupOldMessages(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const repository = this.getRepository();
    const result = await repository
      .createQueryBuilder()
      .delete()
      .where('deletedAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

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
    return !this.deletedAt && (this.senderId === userId || isAdmin);
  }

  /**
   * 편집 가능한지 확인 (텍스트 메시지만, 발신자만, 시간 제한)
   */
  canEdit(userId: number, timeLimit: number = 900000): boolean {
    // 15분 기본
    if (this.deletedAt || this.senderId !== userId || !this.isTextMessage()) {
      return false;
    }

    const editTimeLimit = Date.now() - this.createdAt.getTime();
    return editTimeLimit <= timeLimit;
  }

  /**
   * 메시지 소프트 삭제 준비 (실제 삭제는 TypeORM이 처리)
   */
  prepareForSoftDelete(deletedBy: number, reason?: string): void {
    this.deletedBy = deletedBy;
    this.deletionReason = reason || 'User requested';
    // TypeORM의 softRemove가 deletedAt을 자동으로 설정
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
    if (!this.firstReadAt) {
      this.firstReadAt = new Date();
    }
    this.status = MessageStatus.READ;
  }

  /**
   * 읽은 수 가져오기 (readReceipts 관계가 로드되어 있을 때)
   */
  getReadCount(): number {
    return this.readReceipts?.length || this.readCount || 0;
  }

  /**
   * 답장 수 가져오기 (replies 관계가 로드되어 있을 때)
   */
  getReplyCount(): number {
    return this.replies?.length || this.replyCount || 0;
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

  /**
   * 발신자 표시 이름 반환 (탈퇴한 사용자 처리)
   */
  getSenderDisplayName(fallbackName?: string): string {
    if (this.isFromDeletedUser) {
      return this.deletedUserType === 'admin'
        ? '탈퇴한 관리자'
        : '탈퇴한 사용자';
    }

    return this.sender?.name || fallbackName || '알 수 없음';
  }

  /**
   * 메시지가 탈퇴한 사용자의 것인지 확인
   */
  isFromDeletedUserAccount(): boolean {
    return this.isFromDeletedUser;
  }

  /**
   * 탈퇴한 사용자 타입 확인
   */
  getDeletedUserType(): 'user' | 'admin' | null {
    return this.isFromDeletedUser ? this.deletedUserType || null : null;
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 메시지 생성 전 기본값 설정 및 보안 검증
   * - 입력값 정제 (XSS 방지)
   * - 검색용 텍스트 생성
   * - 기본 상태 설정
   */
  @BeforeInsert()
  beforeInsert() {
    // 기본 상태 설정
    this.status = this.status || MessageStatus.SENT;
    this.isEdited = this.isEdited || false;

    // 텍스트 메시지 입력 정제 (XSS 방지)
    if (this.type === MessageType.TEXT && this.content) {
      this.content = SanitizationUtil.sanitizeText(this.content, 5000);
    }

    // 파일명 정제 (Path Traversal 방지)
    if (this.fileMetadata && this.fileMetadata.originalName) {
      this.fileMetadata.originalName = SanitizationUtil.sanitizeFileName(
        this.fileMetadata.originalName,
      );
    }

    // 검색용 텍스트 생성
    this.updateSearchableText();

    // Message creation logged
  }

  /**
   * 메시지 수정 전 처리 및 보안 검증
   * - 입력값 정제 (XSS 방지)
   * - 편집 정보 업데이트
   * - 검색용 텍스트 재생성
   */
  @BeforeUpdate()
  beforeUpdate() {
    // 텍스트 메시지 입력 정제 (XSS 방지)
    if (this.type === MessageType.TEXT && this.content) {
      this.content = SanitizationUtil.sanitizeText(this.content, 5000);
    }

    // 검색용 텍스트 재생성 (내용이 변경된 경우)
    this.updateSearchableText();

    // Message update logged
  }
}
