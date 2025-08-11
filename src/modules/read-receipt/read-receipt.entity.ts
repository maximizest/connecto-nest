import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from '../message/message.entity';
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';

/**
 * 메시지 읽음 영수증 엔티티
 *
 * Planet별로 각 사용자의 메시지 읽음 상태를 추적합니다.
 * - 개별 메시지별 읽음 상태
 * - Planet별 마지막 읽은 메시지
 * - 읽지 않은 메시지 카운트
 */
@Entity('message_read_receipts')
@Unique(['messageId', 'userId']) // 동일 사용자가 같은 메시지를 중복으로 읽음 처리하지 않도록
@Index(['planetId']) // Planet별 조회 최적화
@Index(['userId']) // 사용자별 조회 최적화
@Index(['messageId']) // 메시지별 조회 최적화
@Index(['readAt']) // 읽은 시간 정렬
@Index(['isRead']) // 읽음 상태별 필터링
// 복합 인덱스 - 성능 향상
@Index(['planetId', 'userId']) // Planet 내 사용자별 읽음 상태
@Index(['planetId', 'isRead']) // Planet 내 읽음 상태별 조회
@Index(['messageId', 'isRead']) // 메시지별 읽음 상태
@Index(['userId', 'isRead']) // 사용자별 읽음 상태
@Index(['planetId', 'userId', 'readAt']) // Planet 내 사용자별 시간순 조회
@Index(['planetId', 'messageId', 'userId']) // 트리플 인덱스 (고성능 조회)
export class MessageReadReceipt extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: '메시지 ID' })
  @IsNumber()
  @Index()
  messageId: number;

  @ManyToOne(() => Message, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column({ comment: '사용자 ID' })
  @IsNumber()
  @Index()
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ comment: 'Planet ID' })
  @IsNumber()
  @Index()
  planetId: number;

  @ManyToOne(() => Planet, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  /**
   * 읽음 상태 정보
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '읽음 여부',
  })
  @IsBoolean()
  @Index()
  isRead: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '읽은 시간',
  })
  @IsDateString()
  @Index()
  readAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '읽은 디바이스 타입',
  })
  @IsOptional()
  @IsString()
  deviceType?: string; // 'mobile', 'desktop', 'tablet', 'web'

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User Agent',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '추가 읽음 메타데이터',
  })
  @IsOptional()
  metadata?: {
    readSource?: 'auto' | 'manual' | 'scroll'; // 읽음 처리 방식
    readDuration?: number; // 읽는데 걸린 시간 (ms)
    scrollPosition?: number; // 스크롤 위치
    viewportSize?: {
      width: number;
      height: number;
    };
    location?: {
      // 위치 정보 (선택사항)
      latitude: number;
      longitude: number;
      address?: string;
    };
    sessionId?: string; // 세션 ID
    clientMessageId?: string; // 클라이언트 메시지 ID
    batchReadCount?: number; // 일괄 읽음 처리된 메시지 수
  };

  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: '읽음 영수증 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: '읽음 영수증 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 읽음 표시
   */
  markAsRead(deviceType?: string, userAgent?: string): void {
    this.isRead = true;
    this.readAt = new Date();
    if (deviceType) this.deviceType = deviceType;
    if (userAgent) this.userAgent = userAgent;
  }

  /**
   * 읽지 않음으로 표시 (테스트용)
   */
  markAsUnread(): void {
    this.isRead = false;
    this.readAt = new Date();
  }

  /**
   * 읽음 처리 시간 계산 (메시지 생성부터 읽기까지)
   */
  getReadDelay(messageCreatedAt: Date): number {
    return this.readAt.getTime() - messageCreatedAt.getTime();
  }

  /**
   * 디바이스별 읽음 통계용 정보
   */
  getDeviceInfo(): {
    deviceType: string;
    userAgent: string | null;
    readSource: string;
  } {
    return {
      deviceType: this.deviceType || 'unknown',
      userAgent: this.userAgent || null,
      readSource: this.metadata?.readSource || 'manual',
    };
  }

  /**
   * 읽음 분석 데이터 생성
   */
  getAnalyticsData(): {
    messageId: number;
    userId: number;
    planetId: number;
    readDelay: number | null;
    deviceType: string;
    readSource: string;
    readDuration: number | null;
    hasLocation: boolean;
  } {
    return {
      messageId: this.messageId,
      userId: this.userId,
      planetId: this.planetId,
      readDelay: this.message
        ? this.getReadDelay(this.message.createdAt)
        : null,
      deviceType: this.deviceType || 'unknown',
      readSource: this.metadata?.readSource || 'manual',
      readDuration: this.metadata?.readDuration || null,
      hasLocation: !!this.metadata?.location,
    };
  }

  /**
   * 읽음 영수증 요약 정보
   */
  getSummary(): {
    id: number;
    messageId: number;
    userId: number;
    planetId: number;
    isRead: boolean;
    readAt: Date;
    deviceType: string;
    readDelay?: number;
  } {
    return {
      id: this.id,
      messageId: this.messageId,
      userId: this.userId,
      planetId: this.planetId,
      isRead: this.isRead,
      readAt: this.readAt,
      deviceType: this.deviceType || 'unknown',
      readDelay: this.message
        ? this.getReadDelay(this.message.createdAt)
        : undefined,
    };
  }
}
