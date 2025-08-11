import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import { NotificationService } from '../notification/notification.service';
import {
  MetricCategory,
  MetricType,
  PerformanceAlert,
  PerformanceMetric,
} from './performance.entity';

interface MetricData {
  type: MetricType;
  value: number;
  unit?: string;
  resourceType?: string;
  resourceId?: number;
  metadata?: any;
}

interface AlertThreshold {
  type: MetricType;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: 'greater' | 'less' | 'equal';
}

/**
 * 성능 모니터링 서비스
 *
 * 애플리케이션의 다양한 성능 지표를 실시간으로 수집, 분석, 모니터링합니다.
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly CACHE_PREFIX = 'perf_metrics';
  private readonly CACHE_TTL = 300; // 5분

  // 기본 알람 임계값 설정
  private readonly DEFAULT_THRESHOLDS: AlertThreshold[] = [
    {
      type: MetricType.API_RESPONSE_TIME,
      threshold: 5000,
      severity: 'high',
      condition: 'greater',
    },
    {
      type: MetricType.DATABASE_QUERY_TIME,
      threshold: 1000,
      severity: 'medium',
      condition: 'greater',
    },
    {
      type: MetricType.CACHE_HIT_RATE,
      threshold: 70,
      severity: 'medium',
      condition: 'less',
    },
    {
      type: MetricType.FILE_UPLOAD_SPEED,
      threshold: 1,
      severity: 'low',
      condition: 'less',
    },
    {
      type: MetricType.FILE_PROCESSING_TIME,
      threshold: 30000,
      severity: 'high',
      condition: 'greater',
    },
    {
      type: MetricType.MEMORY_USAGE,
      threshold: 90,
      severity: 'critical',
      condition: 'greater',
    },
    {
      type: MetricType.CPU_USAGE,
      threshold: 95,
      severity: 'critical',
      condition: 'greater',
    },
    {
      type: MetricType.ERROR_RATE,
      threshold: 5,
      severity: 'high',
      condition: 'greater',
    },
  ];

  constructor(
    @InjectRepository(PerformanceMetric)
    private readonly performanceMetricRepository: Repository<PerformanceMetric>,
    @InjectRepository(PerformanceAlert)
    private readonly performanceAlertRepository: Repository<PerformanceAlert>,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {
    this.logger.log('🔍 Performance monitoring service initialized');
  }

  /**
   * 성능 메트릭 기록
   */
  async recordMetric(data: MetricData): Promise<void> {
    try {
      // 메트릭 엔티티 생성
      const metric = this.performanceMetricRepository.create({
        type: data.type,
        category: this.getMetricCategory(data.type),
        value: data.value,
        unit: data.unit || this.getDefaultUnit(data.type),
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata,
      });

      // 데이터베이스에 저장
      await this.performanceMetricRepository.save(metric);

      // Redis에 최신 메트릭 캐싱
      await this.cacheLatestMetric(metric);

      // 임계값 검사 및 알람 생성
      await this.checkThresholds(metric);

      // 실시간 이벤트 발행
      this.eventEmitter.emit('performance.metric.recorded', { metric });
    } catch (error) {
      this.logger.error(
        `Failed to record metric: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * API 응답 시간 기록
   */
  async recordApiResponseTime(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: number,
  ): Promise<void> {
    await this.recordMetric({
      type: MetricType.API_RESPONSE_TIME,
      value: responseTime,
      unit: 'ms',
      metadata: {
        endpoint,
        method,
        statusCode,
        userId,
      },
    });
  }

  /**
   * 데이터베이스 쿼리 시간 기록
   */
  async recordDatabaseQueryTime(
    query: string,
    executionTime: number,
    resourceType?: string,
    resourceId?: number,
  ): Promise<void> {
    await this.recordMetric({
      type: MetricType.DATABASE_QUERY_TIME,
      value: executionTime,
      unit: 'ms',
      resourceType,
      resourceId,
      metadata: {
        query: query.substring(0, 200), // 쿼리 일부만 저장
      },
    });
  }

  /**
   * 캐시 히트율 기록
   */
  async recordCacheHitRate(
    cacheType: string,
    hitRate: number,
    resourceType?: string,
  ): Promise<void> {
    await this.recordMetric({
      type: MetricType.CACHE_HIT_RATE,
      value: hitRate,
      unit: '%',
      resourceType,
      metadata: {
        cacheType,
      },
    });
  }

  /**
   * 파일 업로드 속도 기록
   */
  async recordFileUploadSpeed(
    fileName: string,
    fileSize: number,
    uploadTime: number,
    userId?: number,
    resourceType?: string,
    resourceId?: number,
  ): Promise<void> {
    const speedMBps = fileSize / (1024 * 1024) / (uploadTime / 1000);

    await this.recordMetric({
      type: MetricType.FILE_UPLOAD_SPEED,
      value: speedMBps,
      unit: 'MB/s',
      resourceType,
      resourceId,
      metadata: {
        fileName,
        fileSize,
        uploadTime,
        userId,
      },
    });
  }

  /**
   * 파일 처리 시간 기록
   */
  async recordFileProcessingTime(
    fileName: string,
    processingType: string,
    processingTime: number,
    resourceType?: string,
    resourceId?: number,
  ): Promise<void> {
    await this.recordMetric({
      type: MetricType.FILE_PROCESSING_TIME,
      value: processingTime,
      unit: 'ms',
      resourceType,
      resourceId,
      metadata: {
        fileName,
        processingType,
      },
    });
  }

  /**
   * WebSocket 연결 수 기록
   */
  async recordWebSocketConnections(connectionCount: number): Promise<void> {
    await this.recordMetric({
      type: MetricType.WEBSOCKET_CONNECTION,
      value: connectionCount,
      unit: 'count',
    });
  }

  /**
   * 시스템 리소스 사용량 기록
   */
  async recordSystemUsage(
    memoryUsage: number,
    cpuUsage: number,
    diskUsage: number,
  ): Promise<void> {
    await Promise.all([
      this.recordMetric({
        type: MetricType.MEMORY_USAGE,
        value: memoryUsage,
        unit: '%',
      }),
      this.recordMetric({
        type: MetricType.CPU_USAGE,
        value: cpuUsage,
        unit: '%',
      }),
      this.recordMetric({
        type: MetricType.DISK_USAGE,
        value: diskUsage,
        unit: '%',
      }),
    ]);
  }

  /**
   * 에러율 기록
   */
  async recordErrorRate(
    errorCount: number,
    totalRequests: number,
    resourceType?: string,
  ): Promise<void> {
    const errorRate = (errorCount / totalRequests) * 100;

    await this.recordMetric({
      type: MetricType.ERROR_RATE,
      value: errorRate,
      unit: '%',
      resourceType,
      metadata: {
        errorCount,
        totalRequests,
      },
    });
  }

  /**
   * 동시 사용자 수 기록
   */
  async recordConcurrentUsers(userCount: number): Promise<void> {
    await this.recordMetric({
      type: MetricType.CONCURRENT_USERS,
      value: userCount,
      unit: 'count',
    });
  }

  /**
   * 성능 메트릭 조회 (최근 24시간)
   */
  async getMetrics(
    type?: MetricType,
    category?: MetricCategory,
    resourceType?: string,
    resourceId?: number,
    hours: number = 24,
  ): Promise<PerformanceMetric[]> {
    const cacheKey = `${this.CACHE_PREFIX}:metrics:${type || 'all'}:${category || 'all'}:${resourceType || 'all'}:${resourceId || 'all'}:${hours}h`;

    try {
      // 캐시에서 확인
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 쿼리 빌더 생성
      const queryBuilder =
        this.performanceMetricRepository.createQueryBuilder('metric');

      // 시간 범위 설정
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      queryBuilder.where('metric.createdAt >= :startTime', { startTime });

      // 필터 조건 추가
      if (type) {
        queryBuilder.andWhere('metric.type = :type', { type });
      }
      if (category) {
        queryBuilder.andWhere('metric.category = :category', { category });
      }
      if (resourceType) {
        queryBuilder.andWhere('metric.resourceType = :resourceType', {
          resourceType,
        });
      }
      if (resourceId) {
        queryBuilder.andWhere('metric.resourceId = :resourceId', {
          resourceId,
        });
      }

      // 정렬 및 제한
      queryBuilder.orderBy('metric.createdAt', 'DESC').limit(1000);

      const metrics = await queryBuilder.getMany();

      // 캐시에 저장
      await this.redisService.set(
        cacheKey,
        JSON.stringify(metrics),
        this.CACHE_TTL,
      );

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 성능 통계 조회
   */
  async getPerformanceStats(
    type?: MetricType,
    hours: number = 24,
  ): Promise<{
    avg: number;
    min: number;
    max: number;
    count: number;
    performanceScore: number;
  }> {
    const cacheKey = `${this.CACHE_PREFIX}:stats:${type || 'all'}:${hours}h`;

    try {
      // 캐시에서 확인
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 통계 쿼리
      const queryBuilder = this.performanceMetricRepository
        .createQueryBuilder('metric')
        .select([
          'AVG(metric.value) as avg',
          'MIN(metric.value) as min',
          'MAX(metric.value) as max',
          'COUNT(metric.id) as count',
        ]);

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      queryBuilder.where('metric.createdAt >= :startTime', { startTime });

      if (type) {
        queryBuilder.andWhere('metric.type = :type', { type });
      }

      const result = await queryBuilder.getRawOne();

      const stats = {
        avg: parseFloat(result.avg) || 0,
        min: parseFloat(result.min) || 0,
        max: parseFloat(result.max) || 0,
        count: parseInt(result.count) || 0,
        performanceScore: this.calculatePerformanceScore(
          parseFloat(result.avg) || 0,
          type,
        ),
      };

      // 캐시에 저장
      await this.redisService.set(
        cacheKey,
        JSON.stringify(stats),
        this.CACHE_TTL,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get performance stats: ${error.message}`,
        error.stack,
      );
      return { avg: 0, min: 0, max: 0, count: 0, performanceScore: 0 };
    }
  }

  /**
   * 활성 알람 조회
   */
  async getActiveAlerts(severity?: string): Promise<PerformanceAlert[]> {
    try {
      const queryBuilder = this.performanceAlertRepository
        .createQueryBuilder('alert')
        .where('alert.isResolved = false');

      if (severity) {
        queryBuilder.andWhere('alert.severity = :severity', { severity });
      }

      return await queryBuilder.orderBy('alert.createdAt', 'DESC').getMany();
    } catch (error) {
      this.logger.error(
        `Failed to get active alerts: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 알람 해결
   */
  async resolveAlert(alertId: number): Promise<void> {
    try {
      const alert = await this.performanceAlertRepository.findOne({
        where: { id: alertId },
      });

      if (alert && !alert.isResolved) {
        alert.resolve();
        await this.performanceAlertRepository.save(alert);

        this.eventEmitter.emit('performance.alert.resolved', { alert });
        this.logger.log(`Performance alert resolved: ${alert.title}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to resolve alert: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 성능 메트릭 카테고리 결정
   */
  private getMetricCategory(type: MetricType): MetricCategory {
    switch (type) {
      case MetricType.API_RESPONSE_TIME:
        return MetricCategory.API;
      case MetricType.DATABASE_QUERY_TIME:
        return MetricCategory.DATABASE;
      case MetricType.CACHE_HIT_RATE:
        return MetricCategory.CACHE;
      case MetricType.FILE_UPLOAD_SPEED:
      case MetricType.FILE_DOWNLOAD_SPEED:
      case MetricType.FILE_PROCESSING_TIME:
        return MetricCategory.FILE_STORAGE;
      case MetricType.WEBSOCKET_CONNECTION:
        return MetricCategory.WEBSOCKET;
      case MetricType.MEMORY_USAGE:
      case MetricType.CPU_USAGE:
      case MetricType.DISK_USAGE:
        return MetricCategory.SYSTEM;
      case MetricType.ERROR_RATE:
        return MetricCategory.ERROR;
      case MetricType.CONCURRENT_USERS:
        return MetricCategory.USER;
      default:
        return MetricCategory.SYSTEM;
    }
  }

  /**
   * 기본 단위 반환
   */
  private getDefaultUnit(type: MetricType): string {
    switch (type) {
      case MetricType.API_RESPONSE_TIME:
      case MetricType.DATABASE_QUERY_TIME:
      case MetricType.FILE_PROCESSING_TIME:
        return 'ms';
      case MetricType.CACHE_HIT_RATE:
      case MetricType.MEMORY_USAGE:
      case MetricType.CPU_USAGE:
      case MetricType.DISK_USAGE:
      case MetricType.ERROR_RATE:
        return '%';
      case MetricType.FILE_UPLOAD_SPEED:
      case MetricType.FILE_DOWNLOAD_SPEED:
        return 'MB/s';
      case MetricType.WEBSOCKET_CONNECTION:
      case MetricType.CONCURRENT_USERS:
        return 'count';
      default:
        return 'unit';
    }
  }

  /**
   * 최신 메트릭 캐싱
   */
  private async cacheLatestMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:latest:${metric.type}${metric.resourceType ? `:${metric.resourceType}` : ''}${metric.resourceId ? `:${metric.resourceId}` : ''}`;
      await this.redisService.set(
        cacheKey,
        JSON.stringify(metric),
        this.CACHE_TTL,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache latest metric: ${error.message}`);
    }
  }

  /**
   * 임계값 검사 및 알람 생성
   */
  private async checkThresholds(metric: PerformanceMetric): Promise<void> {
    try {
      const threshold = this.DEFAULT_THRESHOLDS.find(
        (t) => t.type === metric.type,
      );
      if (!threshold) return;

      let shouldAlert = false;
      switch (threshold.condition) {
        case 'greater':
          shouldAlert = metric.value > threshold.threshold;
          break;
        case 'less':
          shouldAlert = metric.value < threshold.threshold;
          break;
        case 'equal':
          shouldAlert = metric.value === threshold.threshold;
          break;
      }

      if (shouldAlert) {
        await this.createAlert(metric, threshold);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check thresholds: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 알람 생성
   */
  private async createAlert(
    metric: PerformanceMetric,
    threshold: AlertThreshold,
  ): Promise<void> {
    try {
      // 중복 알람 확인 (같은 타입의 미해결 알람이 있는지)
      const existingAlert = await this.performanceAlertRepository.findOne({
        where: {
          metricType: metric.type,
          isResolved: false,
          resourceType: metric.resourceType,
          resourceId: metric.resourceId,
        },
      });

      if (existingAlert) return; // 이미 알람이 있으면 생성하지 않음

      // 새 알람 생성
      const alert = this.performanceAlertRepository.create({
        metricType: metric.type,
        severity: threshold.severity,
        title: this.generateAlertTitle(metric.type, threshold.severity),
        description: this.generateAlertDescription(metric, threshold),
        threshold: threshold.threshold,
        currentValue: metric.value,
        resourceType: metric.resourceType,
        resourceId: metric.resourceId,
        context: {
          unit: metric.unit,
          metadata: metric.metadata,
        },
      });

      await this.performanceAlertRepository.save(alert);

      // 이벤트 발행
      this.eventEmitter.emit('performance.alert.created', { alert });

      // 알림 전송
      await this.sendAlertNotification(alert);

      this.logger.warn(
        `Performance alert created: ${alert.title} (${alert.severity})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create alert: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 알람 제목 생성
   */
  private generateAlertTitle(type: MetricType, severity: string): string {
    const titles = {
      [MetricType.API_RESPONSE_TIME]: 'API 응답 시간 지연',
      [MetricType.DATABASE_QUERY_TIME]: '데이터베이스 쿼리 지연',
      [MetricType.CACHE_HIT_RATE]: '캐시 히트율 저하',
      [MetricType.FILE_UPLOAD_SPEED]: '파일 업로드 속도 저하',
      [MetricType.FILE_PROCESSING_TIME]: '파일 처리 시간 지연',
      [MetricType.MEMORY_USAGE]: '메모리 사용량 과다',
      [MetricType.CPU_USAGE]: 'CPU 사용량 과다',
      [MetricType.ERROR_RATE]: '에러율 증가',
    };

    return `${titles[type] || '성능 이상'} (${severity.toUpperCase()})`;
  }

  /**
   * 알람 설명 생성
   */
  private generateAlertDescription(
    metric: PerformanceMetric,
    threshold: AlertThreshold,
  ): string {
    return `${metric.type}이(가) 임계값을 초과했습니다. 현재 값: ${metric.value}${metric.unit}, 임계값: ${threshold.threshold}${metric.unit}`;
  }

  /**
   * 알람 알림 전송
   */
  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    try {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        // 관리자에게 긴급 알림 전송
        // Note: 실제 구현에서는 관리자 사용자 목록을 조회해서 알림을 보내야 함
        this.logger.warn(
          `Critical performance alert: ${alert.title} - ${alert.description}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send alert notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 성능 점수 계산
   */
  private calculatePerformanceScore(value: number, type?: MetricType): number {
    if (!type) return 50; // 기본 점수

    switch (type) {
      case MetricType.API_RESPONSE_TIME:
        return Math.max(0, 100 - (value - 1000) / 50);
      case MetricType.DATABASE_QUERY_TIME:
        return Math.max(0, 100 - (value - 100) / 10);
      case MetricType.CACHE_HIT_RATE:
        return value;
      case MetricType.FILE_UPLOAD_SPEED:
      case MetricType.FILE_DOWNLOAD_SPEED:
        return Math.min(100, value * 10);
      default:
        return Math.max(0, 100 - value);
    }
  }
}
