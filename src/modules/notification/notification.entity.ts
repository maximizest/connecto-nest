import {
  IsBoolean,
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
 * 알림 타입
 */
export enum NotificationType {
  // 메시지 관련
  MESSAGE_RECEIVED = 'message_received', // 새 메시지
  MESSAGE_MENTION = 'message_mention', // 메시지에서 언급
  MESSAGE_REPLY = 'message_reply', // 메시지 답글
  MESSAGE_EDITED = 'message_edited', // 메시지 편집
  MESSAGE_DELETED = 'message_deleted', // 메시지 삭제

  // Travel 관련
  TRAVEL_INVITATION = 'travel_invitation', // Travel 초대
  TRAVEL_JOIN_REQUEST = 'travel_join_request', // Travel 가입 요청
  TRAVEL_MEMBER_JOINED = 'travel_member_joined', // 새 멤버 가입
  TRAVEL_MEMBER_LEFT = 'travel_member_left', // 멤버 탈퇴
  TRAVEL_EXPIRY_WARNING = 'travel_expiry_warning', // Travel 만료 경고
  TRAVEL_EXPIRED = 'travel_expired', // Travel 만료
  TRAVEL_UPDATED = 'travel_updated', // Travel 정보 업데이트
  TRAVEL_DELETED = 'travel_deleted', // Travel 삭제

  // Planet 관련
  PLANET_CREATED = 'planet_created', // 새 Planet 생성
  PLANET_INVITATION = 'planet_invitation', // Planet 초대
  PLANET_MEMBER_JOINED = 'planet_member_joined', // Planet 멤버 가입
  PLANET_MEMBER_LEFT = 'planet_member_left', // Planet 멤버 탈퇴
  PLANET_UPDATED = 'planet_updated', // Planet 정보 업데이트
  PLANET_DELETED = 'planet_deleted', // Planet 삭제

  // 사용자 관련
  USER_BANNED = 'user_banned', // 사용자 밴
  USER_UNBANNED = 'user_unbanned', // 사용자 언밴
  USER_ROLE_CHANGED = 'user_role_changed', // 사용자 역할 변경

  // 시스템 관련
  SYSTEM_ANNOUNCEMENT = 'system_announcement', // 시스템 공지
  SYSTEM_MAINTENANCE = 'system_maintenance', // 시스템 점검
  SYSTEM_UPDATE = 'system_update', // 시스템 업데이트
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
 * 알림 상태
 */
export enum NotificationStatus {
  PENDING = 'pending', // 대기 중
  SENT = 'sent', // 전송됨
  DELIVERED = 'delivered', // 배달됨
  READ = 'read', // 읽음
  FAILED = 'failed', // 실패
  CANCELLED = 'cancelled', // 취소됨
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
@Index(['userId', 'isRead']) // 사용자별 읽지 않은 알림
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
   * 읽음 상태
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '읽음 여부',
  })
  @IsBoolean()
  @Index() // 읽음 상태 필터링
  isRead: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '읽은 시간',
  })
  @IsOptional()
  @IsDateString()
  readAt?: Date;

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

  @Column({
    type: 'json',
    nullable: true,
    comment: '채널별 전송 결과',
  })
  @IsOptional()
  @IsJSON()
  deliveryResults?: Record<
    NotificationChannel,
    {
      status: 'success' | 'failed' | 'pending';
      sentAt?: Date;
      deliveredAt?: Date;
      errorMessage?: string;
      attempts: number;
    }
  >;

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
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '알림 메타데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  metadata?: {
    deviceType?: string; // 대상 디바이스 타입
    appVersion?: string; // 앱 버전
    locale?: string; // 언어/지역
    timezone?: string; // 시간대
    retryCount?: number; // 재시도 횟수
    batchId?: string; // 배치 ID (대량 전송시)
    tags?: string[]; // 분류 태그
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
   * 알림 읽음 처리
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
    this.status = NotificationStatus.READ;
  }

  /**
   * 알림 전송 완료 처리
   */
  markAsDelivered(channel: NotificationChannel): void {
    if (!this.deliveryResults) {
      this.deliveryResults = {} as any;
    }

    const currentAttempts = this.deliveryResults?.[channel]?.attempts || 0;

    this.deliveryResults![channel] = {
      status: 'success',
      sentAt: new Date(),
      deliveredAt: new Date(),
      attempts: currentAttempts + 1,
    };

    // 모든 채널 전송 완료 시 상태 업데이트
    const allChannelsDelivered = this.channels.every(
      (ch) => this.deliveryResults![ch]?.status === 'success',
    );

    if (allChannelsDelivered) {
      this.status = NotificationStatus.DELIVERED;
    }
  }

  /**
   * 알림 전송 실패 처리
   */
  markAsFailed(channel: NotificationChannel, error: string): void {
    if (!this.deliveryResults) {
      this.deliveryResults = {} as any;
    }

    const currentAttempts = this.deliveryResults?.[channel]?.attempts || 0;

    this.deliveryResults![channel] = {
      status: 'failed',
      sentAt: new Date(),
      errorMessage: error,
      attempts: currentAttempts + 1,
    };

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
    if (this.status === NotificationStatus.CANCELLED) return false;
    if (this.status === NotificationStatus.DELIVERED) return false;
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
    isRead: boolean;
    createdAt: Date;
    hasActions: boolean;
  } {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      priority: this.priority,
      isRead: this.isRead,
      createdAt: this.createdAt,
      hasActions: !!(this.data?.actionUrl || this.data?.actionText),
    };
  }
}
