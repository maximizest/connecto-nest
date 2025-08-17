import {
  IsDateString,
  IsEnum,
  IsJSON,
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
  UpdateDateColumn,
} from 'typeorm';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';

/**
 * 알림 타입 - 단순화된 5가지 핵심 타입
 */
export enum NotificationType {
  MESSAGE = 'message', // 새 메시지
  MENTION = 'mention', // 메시지에서 멘션
  REPLY = 'reply', // 메시지 답글
  BANNED = 'banned', // 사용자 차단
  SYSTEM = 'system', // 시스템 공지/점검/업데이트
}

/**
 * 알림 우선순위
 */
export enum NotificationPriority {
  LOW = 'low', // 낮음
  NORMAL = 'normal', // 보통
  HIGH = 'high', // 높음
  URGENT = 'urgent', // 긴급
}

/**
 * 알림 상태 - 자동 업데이트만
 */
export enum NotificationStatus {
  PENDING = 'pending', // 대기 중
  SENT = 'sent', // 전송됨
  DELIVERED = 'delivered', // 배달됨
  FAILED = 'failed', // 실패
}

/**
 * 알림 채널
 */
export enum NotificationChannel {
  IN_APP = 'in_app', // 인앱 알림
  PUSH = 'push', // 푸시 알림
  EMAIL = 'email', // 이메일
  SMS = 'sms', // SMS (미래 확장)
  WEBSOCKET = 'websocket', // WebSocket 실시간 알림
}

@Entity('notifications')
// 복합 인덱스
@Index(['userId', 'status']) // 사용자별 상태 필터링
@Index(['userId', 'type', 'createdAt']) // 사용자별 타입별 시간순
@Index(['status', 'scheduledAt']) // 예약된 대기 알림
@Index(['travelId', 'type']) // Travel별 알림 타입
@Index(['planetId', 'type']) // Planet별 알림 타입
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({ comment: '알림 받을 사용자 ID' })
  @IsNumber()
  @Index() // 사용자별 알림 조회 최적화
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: '알림 타입',
  })
  @IsEnum(NotificationType)
  @Index() // 알림 타입별 필터링
  type: NotificationType;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '알림 제목',
  })
  @IsString()
  title: string;

  @Column({
    type: 'text',
    comment: '알림 내용',
  })
  @IsString()
  content: string;

  /**
   * 우선순위 및 상태
   */
  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
    comment: '알림 우선순위',
  })
  @IsEnum(NotificationPriority)
  @Index() // 우선순위별 필터링
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
    comment: '알림 상태',
  })
  @IsEnum(NotificationStatus)
  @Index() // 상태별 필터링
  status: NotificationStatus;

  /**
   * 관련 엔티티 참조
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '관련 Travel ID',
  })
  @IsOptional()
  @IsNumber()
  @Index() // Travel별 알림 조회
  travelId?: number;

  @ManyToOne(() => Travel, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'travelId' })
  travel?: Travel;

  @Column({
    type: 'int',
    nullable: true,
    comment: '관련 Planet ID',
  })
  @IsOptional()
  @IsNumber()
  @Index() // Planet별 알림 조회
  planetId?: number;

  @ManyToOne(() => Planet, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planetId' })
  planet?: Planet;

  @Column({
    type: 'int',
    nullable: true,
    comment: '관련 메시지 ID',
  })
  @IsOptional()
  @IsNumber()
  messageId?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: '알림 발생시킨 사용자 ID',
  })
  @IsOptional()
  @IsNumber()
  triggeredBy?: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggeredBy' })
  triggerUser?: User;

  /**
   * 전송 채널 및 옵션
   */
  @Column({
    type: 'json',
    comment: '전송할 채널 목록',
  })
  @IsJSON()
  channels: NotificationChannel[];

  /**
   * 예약 및 만료
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '예약 전송 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 예약 알림 최적화
  scheduledAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '알림 만료 시간',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  /**
   * 추가 데이터 및 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '알림 관련 추가 데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  data?: {
    // 메시지 관련
    messageContent?: string;
    messageType?: string;
    senderName?: string;
    senderAvatar?: string;

    // Travel 관련
    travelName?: string;
    travelDescription?: string;
    endDate?: Date;

    // Planet 관련
    planetName?: string;
    planetType?: string;

    // 액션 관련
    actionUrl?: string; // 클릭 시 이동할 URL
    actionText?: string; // 액션 버튼 텍스트
    actionData?: Record<string, any>; // 액션 관련 데이터

    // 푸시 알림 관련
    badge?: number; // 뱃지 카운트
    sound?: string; // 알림 사운드
    category?: string; // 알림 카테고리
    icon?: string; // 알림 아이콘
    image?: string; // 알림 이미지

    // 사용자 정의 데이터
    customData?: Record<string, any>;
  };

  /**
   * 시간 정보
   */
  @CreateDateColumn({ comment: '알림 생성 시간' })
  @IsOptional()
  @IsDateString()
  @Index() // 생성 시간 정렬 최적화
  createdAt: Date;

  @UpdateDateColumn({ comment: '알림 정보 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 알림 전송 완료 처리
   */
  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
  }

  /**
   * 알림 전송 실패 처리
   */
  markAsFailed(error?: string): void {
    this.status = NotificationStatus.FAILED;
  }

  /**
   * 만료 여부 확인
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * 전송 가능 여부 확인
   */
  canBeSent(): boolean {
    if (this.isExpired()) return false;
    if (this.status === NotificationStatus.DELIVERED) return false;
    if (this.status === NotificationStatus.FAILED) return false;
    if (this.scheduledAt && new Date() < this.scheduledAt) return false;
    return true;
  }

  /**
   * 우선순위별 점수 반환
   */
  getPriorityScore(): number {
    switch (this.priority) {
      case NotificationPriority.URGENT:
        return 4;
      case NotificationPriority.HIGH:
        return 3;
      case NotificationPriority.NORMAL:
        return 2;
      case NotificationPriority.LOW:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * 알림 요약 정보 반환
   */
  getSummary(): {
    id: number;
    type: string;
    title: string;
    priority: string;
    status: string;
    createdAt: Date;
    hasActions: boolean;
  } {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      priority: this.priority,
      status: this.status,
      createdAt: this.createdAt,
      hasActions: !!(this.data?.actionUrl || this.data?.actionText),
    };
  }
}
