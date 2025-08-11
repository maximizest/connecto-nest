import { IsDateString, IsJSON, IsOptional, IsString } from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 분석 데이터 타입
 */
export enum AnalyticsType {
  // Travel 관련
  TRAVEL_OVERVIEW = 'travel_overview',
  TRAVEL_MEMBERS = 'travel_members',
  TRAVEL_ACTIVITY = 'travel_activity',
  TRAVEL_ENGAGEMENT = 'travel_engagement',
  TRAVEL_GROWTH = 'travel_growth',

  // Planet 관련
  PLANET_ACTIVITY = 'planet_activity',
  PLANET_MESSAGES = 'planet_messages',
  PLANET_ENGAGEMENT = 'planet_engagement',
  PLANET_PERFORMANCE = 'planet_performance',

  // 사용자 관련
  USER_ACTIVITY = 'user_activity',
  USER_ENGAGEMENT = 'user_engagement',
  USER_JOURNEY = 'user_journey',

  // 시스템 관련
  SYSTEM_PERFORMANCE = 'system_performance',
  SYSTEM_USAGE = 'system_usage',
}

/**
 * 분석 데이터 집계 주기
 */
export enum AggregationPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * 분석 데이터 엔티티
 *
 * Travel/Planet의 통계 및 분석 데이터를 저장하는 엔티티
 */
@Entity('analytics')
// 복합 인덱스
@Index(['type', 'entityType', 'entityId', 'period']) // 메인 분석 쿼리
@Index(['entityType', 'entityId', 'date']) // 시계열 분석
@Index(['type', 'period', 'date']) // 트렌드 분석
export class Analytics extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({
    type: 'enum',
    enum: AnalyticsType,
    comment: '분석 데이터 타입',
  })
  @Index() // 분석 타입별 조회 최적화
  type: AnalyticsType;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '대상 엔티티 타입 (travel, planet, user 등)',
  })
  @Index() // 엔티티 타입별 조회
  entityType: string;

  @Column({
    type: 'int',
    comment: '대상 엔티티 ID',
  })
  @Index() // 엔티티 ID별 조회
  entityId: number;

  /**
   * 집계 정보
   */
  @Column({
    type: 'enum',
    enum: AggregationPeriod,
    comment: '집계 주기',
  })
  @Index() // 집계 주기별 조회 최적화
  period: AggregationPeriod;

  @Column({
    type: 'date',
    comment: '집계 날짜',
  })
  @Index() // 날짜별 조회 최적화
  date: Date;

  /**
   * 메트릭 데이터
   */
  @Column({
    type: 'json',
    comment: '집계된 메트릭 데이터 (JSON)',
  })
  @IsJSON()
  metrics: {
    // 기본 메트릭
    totalCount?: number;
    uniqueCount?: number;
    averageValue?: number;
    maxValue?: number;
    minValue?: number;

    // Travel 관련 메트릭
    memberCount?: number;
    activeMemberCount?: number;
    planetCount?: number;
    activePlanetCount?: number;
    messageCount?: number;
    averageEngagement?: number;
    retentionRate?: number;
    joinRate?: number;
    leaveRate?: number;

    // Planet 관련 메트릭
    messageVolume?: number;
    uniqueParticipants?: number;
    averageMessageLength?: number;
    peakActivity?: Date;
    silentPeriods?: number;
    typingEvents?: number;
    fileUploads?: number;

    // 사용자 활동 메트릭
    sessionsCount?: number;
    averageSessionDuration?: number;
    pageViews?: number;
    interactions?: number;
    messagesPosted?: number;
    reactionsGiven?: number;
    planetsJoined?: number;
    planetsLeft?: number;

    // 성능 메트릭
    responseTime?: number;
    errorRate?: number;
    uptime?: number;
    throughput?: number;

    // 커스텀 메트릭
    customMetrics?: Record<string, any>;
  };

  /**
   * 차원 데이터 (분석용 추가 정보)
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '차원별 분석 데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  dimensions?: {
    // 지역별 데이터
    byCountry?: Record<string, number>;
    byCity?: Record<string, number>;
    byTimezone?: Record<string, number>;

    // 디바이스별 데이터
    byDeviceType?: Record<string, number>;
    byPlatform?: Record<string, number>;
    byBrowser?: Record<string, number>;

    // 연령/성별 (익명화된 데이터)
    byAgeGroup?: Record<string, number>;
    byGender?: Record<string, number>;

    // 행동 패턴
    byHour?: Record<number, number>; // 시간대별
    byDayOfWeek?: Record<number, number>; // 요일별
    byMonth?: Record<number, number>; // 월별

    // Travel/Planet 특성별
    byTravelSize?: Record<string, number>;
    byPlanetType?: Record<string, number>;
    byEngagementLevel?: Record<string, number>;

    // 사용자 세그먼트
    byUserType?: Record<string, number>;
    bySubscriptionLevel?: Record<string, number>;
  };

  /**
   * 비교 데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '이전 기간 대비 변화량 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  comparison?: {
    previousValue?: number;
    changeAmount?: number;
    changePercent?: number;
    trend?: 'up' | 'down' | 'stable';
    significance?: 'high' | 'medium' | 'low';
  };

  /**
   * 예측 데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '예측/전망 데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  forecast?: {
    nextPeriodPrediction?: number;
    confidence?: number; // 0-100
    predictedTrend?: 'up' | 'down' | 'stable';
    factors?: string[]; // 예측에 영향을 준 요소들
  };

  /**
   * 메타데이터
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '분석 데이터 제목/라벨',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '분석 데이터 설명',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '추가 메타데이터 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  metadata?: {
    generatedBy?: string; // 생성 시스템/스크립트
    generationTime?: Date; // 생성 소요 시간
    dataSource?: string; // 데이터 소스
    quality?: number; // 데이터 품질 점수 0-100
    completeness?: number; // 데이터 완성도 0-100
    lastUpdated?: Date;
    tags?: string[]; // 분류 태그
    version?: string; // 데이터 버전
    aggregationMethod?: string; // 집계 방법
    sampleSize?: number; // 샘플 크기
  };

  /**
   * 시간 정보
   */
  @CreateDateColumn({ comment: '분석 데이터 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: '분석 데이터 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 변화율 계산
   */
  calculateChangePercent(): number {
    if (
      !this.comparison?.previousValue ||
      this.comparison.previousValue === 0
    ) {
      return 0;
    }

    const currentValue = this.metrics.totalCount || 0;
    return Math.round(
      ((currentValue - this.comparison.previousValue) /
        this.comparison.previousValue) *
        100,
    );
  }

  /**
   * 트렌드 판정
   */
  getTrend(): 'up' | 'down' | 'stable' {
    const changePercent = this.calculateChangePercent();

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  /**
   * 데이터 품질 점수 계산
   */
  calculateDataQuality(): number {
    let score = 100;

    // 필수 필드 체크
    if (!this.metrics || Object.keys(this.metrics).length === 0) score -= 30;
    if (!this.date) score -= 20;
    if (!this.entityId) score -= 20;

    // 데이터 완성도 체크
    const expectedMetrics = this.getExpectedMetrics();
    const actualMetrics = Object.keys(this.metrics);
    const completeness = actualMetrics.length / expectedMetrics.length;
    score = score * completeness;

    return Math.max(0, Math.round(score));
  }

  /**
   * 타입별 예상 메트릭 키 반환
   */
  private getExpectedMetrics(): string[] {
    switch (this.type) {
      case AnalyticsType.TRAVEL_OVERVIEW:
        return [
          'memberCount',
          'planetCount',
          'messageCount',
          'averageEngagement',
        ];
      case AnalyticsType.PLANET_ACTIVITY:
        return ['messageVolume', 'uniqueParticipants', 'averageMessageLength'];
      case AnalyticsType.USER_ACTIVITY:
        return ['sessionsCount', 'averageSessionDuration', 'interactions'];
      default:
        return ['totalCount', 'uniqueCount'];
    }
  }

  /**
   * 요약 정보 생성
   */
  getSummary(): {
    type: string;
    entity: string;
    period: string;
    date: Date;
    primaryMetric: number;
    trend: string;
    quality: number;
  } {
    const primaryMetricValue =
      this.metrics.totalCount ||
      this.metrics.memberCount ||
      this.metrics.messageVolume ||
      0;

    return {
      type: this.type,
      entity: `${this.entityType}:${this.entityId}`,
      period: this.period,
      date: this.date,
      primaryMetric: primaryMetricValue,
      trend: this.getTrend(),
      quality: this.calculateDataQuality(),
    };
  }

  /**
   * 시계열 데이터 포맷
   */
  toTimeSeriesPoint(): {
    timestamp: Date;
    value: number;
    metadata?: any;
  } {
    return {
      timestamp: this.date,
      value: this.metrics.totalCount || this.metrics.memberCount || 0,
      metadata: {
        type: this.type,
        period: this.period,
        quality: this.calculateDataQuality(),
        trend: this.getTrend(),
      },
    };
  }
}
