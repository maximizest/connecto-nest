import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 성능 메트릭 타입
 */
export enum MetricType {
  API_RESPONSE_TIME = 'api_response_time', // API 응답 시간
  DATABASE_QUERY_TIME = 'database_query_time', // 데이터베이스 쿼리 시간
  CACHE_HIT_RATE = 'cache_hit_rate', // 캐시 히트율
  FILE_UPLOAD_SPEED = 'file_upload_speed', // 파일 업로드 속도
  FILE_DOWNLOAD_SPEED = 'file_download_speed', // 파일 다운로드 속도
  FILE_PROCESSING_TIME = 'file_processing_time', // 파일 처리 시간
  WEBSOCKET_CONNECTION = 'websocket_connection', // WebSocket 연결 수
  MEMORY_USAGE = 'memory_usage', // 메모리 사용량
  CPU_USAGE = 'cpu_usage', // CPU 사용량
  DISK_USAGE = 'disk_usage', // 디스크 사용량
  ERROR_RATE = 'error_rate', // 에러율
  CONCURRENT_USERS = 'concurrent_users', // 동시 사용자 수
}

/**
 * 성능 메트릭 카테고리
 */
export enum MetricCategory {
  API = 'api',
  DATABASE = 'database',
  CACHE = 'cache',
  FILE_STORAGE = 'file_storage',
  WEBSOCKET = 'websocket',
  SYSTEM = 'system',
  ERROR = 'error',
  USER = 'user',
}

/**
 * 성능 메트릭 엔티티
 *
 * 애플리케이션의 다양한 성능 지표를 실시간으로 수집하고 저장합니다.
 */
@Entity('performance_metrics')
@Index(['type', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['resourceType', 'resourceId', 'createdAt'])
export class PerformanceMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MetricType,
    comment: '메트릭 타입',
  })
  type: MetricType;

  @Column({
    type: 'enum',
    enum: MetricCategory,
    comment: '메트릭 카테고리',
  })
  category: MetricCategory;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '리소스 타입 (travel, planet, message, file)',
  })
  resourceType?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '리소스 ID',
  })
  resourceId?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    comment: '메트릭 값',
  })
  value: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'ms',
    comment: '메트릭 단위 (ms, MB, %, count 등)',
  })
  unit: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '추가 메타데이터',
  })
  metadata?: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userId?: number;
    fileSize?: number;
    fileName?: string;
    userAgent?: string;
    ip?: string;
    location?: string;
    [key: string]: any;
  };

  @CreateDateColumn({
    comment: '메트릭 수집 시간',
  })
  createdAt: Date;

  /**
   * 성능 메트릭의 중요도 판별
   */
  isCritical(): boolean {
    switch (this.type) {
      case MetricType.API_RESPONSE_TIME:
        return this.value > 5000; // 5초 이상
      case MetricType.DATABASE_QUERY_TIME:
        return this.value > 1000; // 1초 이상
      case MetricType.CACHE_HIT_RATE:
        return this.value < 80; // 80% 미만
      case MetricType.FILE_UPLOAD_SPEED:
      case MetricType.FILE_DOWNLOAD_SPEED:
        return this.value < 1; // 1MB/s 미만
      case MetricType.FILE_PROCESSING_TIME:
        return this.value > 30000; // 30초 이상
      case MetricType.MEMORY_USAGE:
      case MetricType.CPU_USAGE:
      case MetricType.DISK_USAGE:
        return this.value > 90; // 90% 이상
      case MetricType.ERROR_RATE:
        return this.value > 5; // 5% 이상
      default:
        return false;
    }
  }

  /**
   * 성능 점수 계산 (0-100)
   */
  getPerformanceScore(): number {
    switch (this.type) {
      case MetricType.API_RESPONSE_TIME:
        // 0-1000ms: 100점, 1000ms 이상 감점
        return Math.max(0, 100 - (this.value - 1000) / 50);
      case MetricType.DATABASE_QUERY_TIME:
        // 0-100ms: 100점, 100ms 이상 감점
        return Math.max(0, 100 - (this.value - 100) / 10);
      case MetricType.CACHE_HIT_RATE:
        return this.value; // 히트율 자체가 점수
      case MetricType.FILE_UPLOAD_SPEED:
      case MetricType.FILE_DOWNLOAD_SPEED:
        // 10MB/s 이상: 100점
        return Math.min(100, this.value * 10);
      default:
        return 100 - this.value; // 일반적으로 값이 낮을수록 좋음
    }
  }
}

/**
 * 성능 알람 엔티티
 */
@Entity('performance_alerts')
@Index(['isResolved', 'createdAt'])
@Index(['severity', 'createdAt'])
export class PerformanceAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MetricType,
    comment: '관련 메트릭 타입',
  })
  metricType: MetricType;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '알람 심각도 (low, medium, high, critical)',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({
    type: 'varchar',
    length: 200,
    comment: '알람 제목',
  })
  title: string;

  @Column({
    type: 'text',
    comment: '알람 설명',
  })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    comment: '임계값',
  })
  threshold: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    comment: '현재 값',
  })
  currentValue: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '관련 리소스 타입',
  })
  resourceType?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '관련 리소스 ID',
  })
  resourceId?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: '해결 여부',
  })
  isResolved: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '해결 시간',
  })
  resolvedAt?: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '추가 컨텍스트 정보',
  })
  context?: {
    affectedUsers?: number;
    impactLevel?: string;
    recommendedActions?: string[];
    [key: string]: any;
  };

  @CreateDateColumn({
    comment: '알람 생성 시간',
  })
  createdAt: Date;

  /**
   * 알람 해결 처리
   */
  resolve(): void {
    this.isResolved = true;
    this.resolvedAt = new Date();
  }

  /**
   * 알람 지속 시간 계산 (분)
   */
  getDuration(): number {
    const endTime = this.resolvedAt || new Date();
    return Math.floor(
      (endTime.getTime() - this.createdAt.getTime()) / (1000 * 60),
    );
  }
}
