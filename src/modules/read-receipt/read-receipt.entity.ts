import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
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
// 복합 인덱스 - 성능 향상
@Index(['planetId', 'userId']) // Planet 내 사용자별 읽음 상태
@Index(['planetId', 'isRead']) // Planet 내 읽음 상태별 조회
@Index(['messageId', 'isRead']) // 메시지별 읽음 상태
@Index(['userId', 'isRead']) // 사용자별 읽음 상태
@Index(['planetId', 'userId', 'readAt']) // Planet 내 사용자별 시간순 조회
@Index(['planetId', 'messageId', 'userId']) // 트리플 인덱스 (고성능 조회)
export class MessageReadReceipt extends BaseActiveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: '메시지 ID' })
  @IsNumber()
  @Index() // 메시지별 조회 최적화
  messageId: number;

  @ManyToOne(() => Message, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column({ comment: '사용자 ID' })
  @IsNumber()
  @Index() // 사용자별 조회 최적화
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ comment: 'Planet ID' })
  @IsNumber()
  @Index() // Planet별 조회 최적화
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
  @Index() // 읽음 상태별 필터링
  isRead: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '읽은 시간',
  })
  @IsDateString()
  @Index() // 읽은 시간 정렬
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
  @IsOptional()
  @IsDateString()

  @IsOptional()
  @IsDateString()

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

  /**
   * Active Record Static Methods
   */

  /**
   * 메시지 읽음 처리
   */
  static async markMessageAsRead(
    messageId: number,
    userId: number,
    planetId: number,
    options?: {
      deviceType?: string;
      userAgent?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      readDuration?: number;
      sessionId?: string;
    },
  ): Promise<MessageReadReceipt | null> {
    // 기존 읽음 영수증 확인
    const existing = await this.findOne({
      where: { messageId, userId },
    });

    if (existing) {
      return existing;
    }

    // 새로운 읽음 영수증 생성
    const receipt = this.create({
      messageId,
      userId,
      planetId,
      isRead: true,
      readAt: new Date(),
      deviceType: options?.deviceType,
      userAgent: options?.userAgent,
      metadata: {
        readSource: options?.readSource || 'manual',
        readDuration: options?.readDuration,
        sessionId: options?.sessionId,
      },
    });

    return await receipt.save();
  }

  /**
   * 여러 메시지 일괄 읽음 처리
   */
  static async markMultipleMessagesAsRead(
    messageIds: number[],
    userId: number,
    planetId: number,
    options?: {
      deviceType?: string;
      userAgent?: string;
      readSource?: 'auto' | 'manual' | 'scroll';
      sessionId?: string;
    },
  ): Promise<MessageReadReceipt[]> {
    if (messageIds.length === 0) return [];

    // 이미 읽은 메시지들 확인
    const existing = await this.find({
      where: { 
        messageId: messageIds.length > 0 ? (messageIds as any) : undefined,
        userId 
      },
    });

    const existingMessageIds = existing.map(r => r.messageId);
    const newMessageIds = messageIds.filter(id => !existingMessageIds.includes(id));

    if (newMessageIds.length === 0) {
      return existing;
    }

    // 새로운 읽음 영수증들 생성
    const newReceipts = newMessageIds.map(messageId =>
      this.create({
        messageId,
        userId,
        planetId,
        isRead: true,
        readAt: new Date(),
        deviceType: options?.deviceType,
        userAgent: options?.userAgent,
        metadata: {
          readSource: options?.readSource || 'auto',
          sessionId: options?.sessionId,
          batchReadCount: newMessageIds.length,
        },
      })
    );

    const savedReceipts = await this.save(newReceipts);
    return [...existing, ...savedReceipts];
  }

  /**
   * Planet의 읽지 않은 메시지 수 조회
   */
  static async getUnreadCountInPlanet(
    planetId: number,
    userId: number,
  ): Promise<number> {
    const queryBuilder = this.getRepository().manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('messages', 'message')
      .leftJoin(
        'message_read_receipts',
        'receipt',
        'receipt.messageId = message.id AND receipt.userId = :userId',
        { userId }
      )
      .where('message.planetId = :planetId', { planetId })
      .andWhere('message.isDeleted = false')
      .andWhere('message.senderId != :userId', { userId }) // 본인 메시지 제외
      .andWhere('(receipt.isRead IS NULL OR receipt.isRead = false)');

    const result = await queryBuilder.getRawOne();
    return parseInt(result.count) || 0;
  }

  /**
   * Planet의 사용자별 읽음 영수증 조회
   */
  static async findByPlanetAndUser(
    planetId: number,
    userId: number,
  ): Promise<MessageReadReceipt[]> {
    return this.find({
      where: { planetId, userId },
      relations: ['message', 'user', 'planet'],
      order: { readAt: 'DESC' },
    });
  }

  /**
   * 메시지별 모든 읽음 영수증 조회
   */
  static async findByMessage(messageId: number): Promise<MessageReadReceipt[]> {
    return this.find({
      where: { messageId },
      relations: ['user'],
      order: { readAt: 'ASC' },
    });
  }

  /**
   * 메시지의 읽음 카운트 조회
   */
  static async getMessageReadCount(messageId: number): Promise<number> {
    return this.count({
      where: { messageId, isRead: true },
    });
  }

  /**
   * 사용자의 마지막 읽음 영수증 조회
   */
  static async getLastReadReceiptInPlanet(
    planetId: number,
    userId: number,
  ): Promise<MessageReadReceipt | null> {
    return this.findOne({
      where: { planetId, userId },
      order: { readAt: 'DESC' },
    });
  }

  /**
   * 사용자 탈퇴 시 영수증 정리
   */
  static async cleanupByUser(userId: number): Promise<void> {
    await this.delete({ userId });
  }

  /**
   * Planet 삭제 시 영수증 정리
   */
  static async cleanupByPlanet(planetId: number): Promise<void> {
    await this.delete({ planetId });
  }

  /**
   * 메시지 삭제 시 영수증 정리
   */
  static async cleanupByMessage(messageId: number): Promise<void> {
    await this.delete({ messageId });
  }
}
