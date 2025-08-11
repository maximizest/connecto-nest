import {
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
import { User } from '../user/user.entity';

/**
 * 스트리밍 세션 상태
 */
export enum StreamingSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
  ERROR = 'error',
}

/**
 * 디바이스 타입
 */
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  TV = 'tv',
  UNKNOWN = 'unknown',
}

/**
 * 스트리밍 세션 엔티티
 */
@Entity('streaming_sessions')
@Index(['userId']) // 사용자별 세션 조회
@Index(['status']) // 상태별 조회
@Index(['storageKey']) // 파일별 조회
@Index(['createdAt']) // 시간별 정렬
@Index(['userId', 'status']) // 사용자별 상태 조회 최적화
@Index(['status', 'createdAt']) // 상태별 시간순 조회
@Index(['storageKey', 'createdAt']) // 파일별 시간순 조회
export class StreamingSession extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 연관 관계
   */
  @Column({ comment: '스트리밍 요청 사용자 ID' })
  @IsNumber()
  @Index()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * 세션 정보
   */
  @Column({ type: 'varchar', length: 100, unique: true, comment: '세션 ID' })
  @IsString()
  @MaxLength(100)
  @Index()
  sessionId: string;

  @Column({ type: 'varchar', length: 500, comment: '스트리밍 파일 키' })
  @IsString()
  @MaxLength(500)
  @Index()
  storageKey: string;

  @Column({
    type: 'enum',
    enum: StreamingSessionStatus,
    default: StreamingSessionStatus.ACTIVE,
    comment: '세션 상태',
  })
  @IsEnum(StreamingSessionStatus)
  @Index()
  status: StreamingSessionStatus;

  /**
   * 스트리밍 설정
   */
  @Column({ type: 'varchar', length: 20, comment: '현재 품질 설정' })
  @IsString()
  @MaxLength(20)
  currentQuality: string;

  @Column({ type: 'varchar', length: 20, comment: '초기 품질 설정' })
  @IsString()
  @MaxLength(20)
  initialQuality: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.UNKNOWN,
    comment: '디바이스 타입',
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User Agent',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  userAgent?: string;

  @Column({ type: 'varchar', length: 45, nullable: true, comment: 'IP 주소' })
  @IsString()
  @IsOptional()
  @MaxLength(45)
  ipAddress?: string;

  /**
   * 성능 메트릭
   */
  @Column({ type: 'bigint', default: 0, comment: '전송된 바이트 수' })
  @IsNumber()
  bytesTransferred: number;

  @Column({ type: 'int', default: 0, comment: '품질 변경 횟수' })
  @IsNumber()
  qualityChanges: number;

  @Column({ type: 'int', default: 0, comment: '버퍼링 이벤트 횟수' })
  @IsNumber()
  bufferingEvents: number;

  @Column({ type: 'int', default: 0, comment: '총 버퍼링 시간 (초)' })
  @IsNumber()
  totalBufferingTime: number;

  @Column({ type: 'int', default: 0, comment: '재생 시간 (초)' })
  @IsNumber()
  playbackTime: number;

  @Column({ type: 'int', nullable: true, comment: '추정 대역폭 (bps)' })
  @IsNumber()
  @IsOptional()
  estimatedBandwidth?: number;

  @Column({ type: 'float', default: 0, comment: '평균 비트레이트 (bps)' })
  @IsNumber()
  averageBitrate: number;

  /**
   * 세션 이벤트 기록
   */
  @Column({ type: 'json', nullable: true, comment: '품질 변경 기록' })
  @IsJSON()
  @IsOptional()
  qualityHistory?: Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
    bandwidth?: number;
  }>;

  @Column({ type: 'json', nullable: true, comment: '버퍼링 이벤트 기록' })
  @IsJSON()
  @IsOptional()
  bufferingHistory?: Array<{
    timestamp: string;
    duration: number;
    position: number;
    quality: string;
  }>;

  @Column({ type: 'json', nullable: true, comment: '에러 로그' })
  @IsJSON()
  @IsOptional()
  errorLogs?: Array<{
    timestamp: string;
    type: string;
    message: string;
    code?: string;
  }>;

  /**
   * 지리적 정보
   */
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '국가' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '도시' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'CDN 엣지 서버',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  edgeServer?: string;

  /**
   * 시간 정보
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '스트리밍 시작 시간',
  })
  @IsDateString()
  @IsOptional()
  startedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '스트리밍 종료 시간',
  })
  @IsDateString()
  @IsOptional()
  endedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 활동 시간',
  })
  @IsDateString()
  @IsOptional()
  lastActivityAt?: Date;

  @CreateDateColumn({ comment: '생성 시간' })
  @IsDateString()
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 스트리밍 세션 시작
   */
  startSession(): void {
    this.status = StreamingSessionStatus.ACTIVE;
    this.startedAt = new Date();
    this.lastActivityAt = new Date();
  }

  /**
   * 스트리밍 세션 종료
   */
  endSession(): void {
    this.status = StreamingSessionStatus.ENDED;
    this.endedAt = new Date();
    this.lastActivityAt = new Date();
  }

  /**
   * 세션 일시정지
   */
  pauseSession(): void {
    this.status = StreamingSessionStatus.PAUSED;
    this.lastActivityAt = new Date();
  }

  /**
   * 세션 재개
   */
  resumeSession(): void {
    this.status = StreamingSessionStatus.ACTIVE;
    this.lastActivityAt = new Date();
  }

  /**
   * 에러 상태로 변경
   */
  markAsError(errorType: string, errorMessage: string): void {
    this.status = StreamingSessionStatus.ERROR;
    this.lastActivityAt = new Date();

    if (!this.errorLogs) {
      this.errorLogs = [];
    }

    this.errorLogs.push({
      timestamp: new Date().toISOString(),
      type: errorType,
      message: errorMessage,
    });
  }

  /**
   * 품질 변경 기록
   */
  recordQualityChange(
    from: string,
    to: string,
    reason: string,
    bandwidth?: number,
  ): void {
    this.currentQuality = to;
    this.qualityChanges += 1;
    this.lastActivityAt = new Date();

    if (!this.qualityHistory) {
      this.qualityHistory = [];
    }

    this.qualityHistory.push({
      timestamp: new Date().toISOString(),
      from,
      to,
      reason,
      bandwidth,
    });

    // 최근 100개 기록만 유지
    if (this.qualityHistory.length > 100) {
      this.qualityHistory = this.qualityHistory.slice(-100);
    }
  }

  /**
   * 버퍼링 이벤트 기록
   */
  recordBufferingEvent(duration: number, position: number): void {
    this.bufferingEvents += 1;
    this.totalBufferingTime += duration;
    this.lastActivityAt = new Date();

    if (!this.bufferingHistory) {
      this.bufferingHistory = [];
    }

    this.bufferingHistory.push({
      timestamp: new Date().toISOString(),
      duration,
      position,
      quality: this.currentQuality,
    });

    // 최근 100개 기록만 유지
    if (this.bufferingHistory.length > 100) {
      this.bufferingHistory = this.bufferingHistory.slice(-100);
    }
  }

  /**
   * 바이트 전송량 업데이트
   */
  updateBytesTransferred(bytes: number): void {
    this.bytesTransferred += bytes;
    this.lastActivityAt = new Date();

    // 평균 비트레이트 계산
    const duration = this.getSessionDuration();
    if (duration > 0) {
      this.averageBitrate = (this.bytesTransferred * 8) / duration; // bps
    }
  }

  /**
   * 세션 지속 시간 계산 (초)
   */
  getSessionDuration(): number {
    if (!this.startedAt) return 0;

    const endTime = this.endedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * 활성 상태 확인
   */
  isActive(): boolean {
    return this.status === StreamingSessionStatus.ACTIVE;
  }

  /**
   * 버퍼링 비율 계산
   */
  getBufferingRatio(): number {
    const duration = this.getSessionDuration();
    if (duration === 0) return 0;

    return Math.round((this.totalBufferingTime / duration) * 100) / 100;
  }

  /**
   * 품질 안정성 점수 (0-100)
   */
  getQualityStabilityScore(): number {
    const duration = this.getSessionDuration();
    if (duration === 0) return 100;

    // 품질 변경 빈도와 버퍼링 비율 기반 점수
    const qualityChangeFreq = this.qualityChanges / (duration / 60); // 분당 변경 횟수
    const bufferingRatio = this.getBufferingRatio();

    const qualityPenalty = Math.min(qualityChangeFreq * 10, 30);
    const bufferingPenalty = Math.min(bufferingRatio * 50, 50);

    return Math.max(0, 100 - qualityPenalty - bufferingPenalty);
  }

  /**
   * 세션 요약 정보
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      storageKey: this.storageKey,
      status: this.status,
      deviceType: this.deviceType,
      currentQuality: this.currentQuality,
      initialQuality: this.initialQuality,
      duration: this.getSessionDuration(),
      bytesTransferred: this.bytesTransferred,
      bytesTransferredMB:
        Math.round((this.bytesTransferred / (1024 * 1024)) * 100) / 100,
      averageBitrate: this.averageBitrate,
      averageBitrateMbps:
        Math.round((this.averageBitrate / 1000000) * 100) / 100,
      qualityChanges: this.qualityChanges,
      bufferingEvents: this.bufferingEvents,
      totalBufferingTime: this.totalBufferingTime,
      bufferingRatio: this.getBufferingRatio(),
      qualityStabilityScore: this.getQualityStabilityScore(),
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      lastActivityAt: this.lastActivityAt,
      country: this.country,
      city: this.city,
      estimatedBandwidth: this.estimatedBandwidth,
      estimatedBandwidthMbps: this.estimatedBandwidth
        ? Math.round((this.estimatedBandwidth / 1000000) * 100) / 100
        : null,
    };
  }

  /**
   * 최근 품질 변경 이력 (최대 10개)
   */
  getRecentQualityChanges() {
    if (!this.qualityHistory) return [];
    return this.qualityHistory.slice(-10);
  }

  /**
   * 최근 버퍼링 이벤트 (최대 10개)
   */
  getRecentBufferingEvents() {
    if (!this.bufferingHistory) return [];
    return this.bufferingHistory.slice(-10);
  }

  /**
   * 성능 분석 데이터
   */
  getPerformanceAnalytics() {
    const duration = this.getSessionDuration();

    return {
      sessionDuration: duration,
      averagePlaybackSpeed:
        this.playbackTime > 0 ? this.playbackTime / duration : 0,
      dataEfficiency:
        this.bytesTransferred > 0
          ? this.playbackTime / (this.bytesTransferred / 1024)
          : 0, // 초/KB
      stabilityMetrics: {
        qualityStability: this.getQualityStabilityScore(),
        bufferingRatio: this.getBufferingRatio(),
        qualityChangeFrequency:
          duration > 0 ? this.qualityChanges / (duration / 60) : 0,
        averageBufferingDuration:
          this.bufferingEvents > 0
            ? this.totalBufferingTime / this.bufferingEvents
            : 0,
      },
    };
  }
}
