import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis.service';
import { OnlinePresenceService } from './online-presence.service';
import { PlanetCacheService } from './planet-cache.service';
import { TravelCacheService } from './travel-cache.service';

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgResponseTime: number;
  lastUpdated: Date;
}

export interface DetailedMetrics {
  travel: CacheMetrics;
  planet: CacheMetrics;
  user: CacheMetrics;
  overall: CacheMetrics;
  redisInfo: {
    memoryUsage: string;
    connectedClients: number;
    totalConnections: number;
    keyCount: number;
  };
}

@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name);

  // 메트릭 저장을 위한 키
  private readonly METRICS_KEY = 'cache:metrics';
  private readonly DETAILED_METRICS_KEY = 'cache:metrics:detailed';

  // 임시 메트릭 카운터 (메모리)
  private metrics = {
    travel: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
    planet: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
    user: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly travelCacheService: TravelCacheService,
    private readonly planetCacheService: PlanetCacheService,
    private readonly onlinePresenceService: OnlinePresenceService,
  ) {}

  /**
   * 캐시 요청 메트릭 기록
   */
  recordCacheRequest(
    service: 'travel' | 'planet' | 'user',
    operation: string,
    isHit: boolean,
    responseTime: number,
  ): void {
    try {
      const metric = this.metrics[service];
      metric.requests++;
      metric.totalTime += responseTime;

      if (isHit) {
        metric.hits++;
      } else {
        metric.misses++;
      }

      this.logger.debug(
        `Cache ${isHit ? 'HIT' : 'MISS'} - ${service}.${operation} (${responseTime}ms)`,
      );
    } catch (error) {
      this.logger.warn(`Failed to record cache metrics: ${error.message}`);
    }
  }

  /**
   * Travel 캐시 메트릭 기록 헬퍼
   */
  recordTravelCacheMetric(
    operation: string,
    isHit: boolean,
    responseTime: number,
  ): void {
    this.recordCacheRequest('travel', operation, isHit, responseTime);
  }

  /**
   * Planet 캐시 메트릭 기록 헬퍼
   */
  recordPlanetCacheMetric(
    operation: string,
    isHit: boolean,
    responseTime: number,
  ): void {
    this.recordCacheRequest('planet', operation, isHit, responseTime);
  }

  /**
   * User 캐시 메트릭 기록 헬퍼
   */
  recordUserCacheMetric(
    operation: string,
    isHit: boolean,
    responseTime: number,
  ): void {
    this.recordCacheRequest('user', operation, isHit, responseTime);
  }

  /**
   * 현재 메트릭 조회
   */
  async getCurrentMetrics(): Promise<DetailedMetrics | null> {
    try {
      return await this.redisService.getJson(this.DETAILED_METRICS_KEY);
    } catch (error) {
      this.logger.warn(`Failed to get current metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * 메트릭 계산 및 저장 (매 5분마다 실행)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async calculateAndStoreMetrics(): Promise<void> {
    try {
      const redisInfo = await this.getRedisInfo();

      const detailedMetrics: DetailedMetrics = {
        travel: this.calculateServiceMetrics('travel'),
        planet: this.calculateServiceMetrics('planet'),
        user: this.calculateServiceMetrics('user'),
        overall: this.calculateOverallMetrics(),
        redisInfo,
      };

      // Redis에 메트릭 저장 (1시간 TTL)
      await this.redisService.setJson(
        this.DETAILED_METRICS_KEY,
        detailedMetrics,
        3600,
      );

      // 메모리 카운터 초기화
      this.resetMetrics();

      this.logger.debug('Cache metrics calculated and stored');
    } catch (error) {
      this.logger.error(
        `Failed to calculate metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 서비스별 메트릭 계산
   */
  private calculateServiceMetrics(
    service: 'travel' | 'planet' | 'user',
  ): CacheMetrics {
    const metric = this.metrics[service];
    const totalRequests = metric.requests;
    const cacheHits = metric.hits;
    const cacheMisses = metric.misses;
    const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    const avgResponseTime =
      totalRequests > 0 ? metric.totalTime / totalRequests : 0;

    return {
      totalRequests,
      cacheHits,
      cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  /**
   * 전체 메트릭 계산
   */
  private calculateOverallMetrics(): CacheMetrics {
    const allMetrics = Object.values(this.metrics);
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requests, 0);
    const totalHits = allMetrics.reduce((sum, m) => sum + m.hits, 0);
    const totalMisses = allMetrics.reduce((sum, m) => sum + m.misses, 0);
    const totalTime = allMetrics.reduce((sum, m) => sum + m.totalTime, 0);

    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const avgResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;

    return {
      totalRequests,
      cacheHits: totalHits,
      cacheMisses: totalMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  /**
   * Redis 정보 조회
   */
  private async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redisService.getInfo();
      return {
        memoryUsage: info.used_memory_human || 'N/A',
        connectedClients: parseInt(info.connected_clients || '0'),
        totalConnections: parseInt(info.total_connections_received || '0'),
        keyCount: parseInt(info.db0?.keys || '0'),
      };
    } catch (error) {
      this.logger.warn(`Failed to get Redis info: ${error.message}`);
      return {
        memoryUsage: 'N/A',
        connectedClients: 0,
        totalConnections: 0,
        keyCount: 0,
      };
    }
  }

  /**
   * 메트릭 카운터 초기화
   */
  private resetMetrics(): void {
    this.metrics = {
      travel: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
      planet: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
      user: { requests: 0, hits: 0, misses: 0, totalTime: 0 },
    };
  }

  /**
   * 캐시 성능 보고서 생성
   */
  async generatePerformanceReport(): Promise<string> {
    try {
      const metrics = await this.getCurrentMetrics();
      if (!metrics) {
        return 'No metrics available';
      }

      const report = [
        '🚀 Cache Performance Report',
        '='.repeat(50),
        `📊 Overall Performance:`,
        `  • Total Requests: ${metrics.overall.totalRequests.toLocaleString()}`,
        `  • Cache Hit Rate: ${metrics.overall.hitRate}%`,
        `  • Avg Response Time: ${metrics.overall.avgResponseTime}ms`,
        '',
        `🌍 Travel Cache:`,
        `  • Requests: ${metrics.travel.totalRequests.toLocaleString()}`,
        `  • Hit Rate: ${metrics.travel.hitRate}%`,
        `  • Avg Time: ${metrics.travel.avgResponseTime}ms`,
        '',
        `🪐 Planet Cache:`,
        `  • Requests: ${metrics.planet.totalRequests.toLocaleString()}`,
        `  • Hit Rate: ${metrics.planet.hitRate}%`,
        `  • Avg Time: ${metrics.planet.avgResponseTime}ms`,
        '',
        `👤 User Cache:`,
        `  • Requests: ${metrics.user.totalRequests.toLocaleString()}`,
        `  • Hit Rate: ${metrics.user.hitRate}%`,
        `  • Avg Time: ${metrics.user.avgResponseTime}ms`,
        '',
        `📈 Redis Status:`,
        `  • Memory Usage: ${metrics.redisInfo.memoryUsage}`,
        `  • Connected Clients: ${metrics.redisInfo.connectedClients}`,
        `  • Total Keys: ${metrics.redisInfo.keyCount.toLocaleString()}`,
        '',
        `⏰ Last Updated: ${metrics.overall.lastUpdated.toLocaleString('ko-KR')}`,
      ];

      return report.join('\n');
    } catch (error) {
      this.logger.error(
        `Failed to generate performance report: ${error.message}`,
        error.stack,
      );
      return 'Failed to generate report';
    }
  }

  /**
   * 캐시 건강 상태 체크
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: DetailedMetrics | null;
  }> {
    try {
      const metrics = await this.getCurrentMetrics();
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      if (!metrics) {
        return {
          status: 'critical',
          issues: ['No metrics available'],
          metrics: null,
        };
      }

      // Hit rate 체크 (70% 이하면 경고)
      if (metrics.overall.hitRate < 70) {
        issues.push(`Low cache hit rate: ${metrics.overall.hitRate}%`);
        status = 'warning';
      }

      // Response time 체크 (100ms 이상이면 경고)
      if (metrics.overall.avgResponseTime > 100) {
        issues.push(`High response time: ${metrics.overall.avgResponseTime}ms`);
        status = 'warning';
      }

      // Redis 연결 체크
      if (metrics.redisInfo.connectedClients === 0) {
        issues.push('No Redis connections');
        status = 'critical';
      }

      // 심각한 문제가 있는지 체크
      if (
        metrics.overall.hitRate < 50 ||
        metrics.overall.avgResponseTime > 500
      ) {
        status = 'critical';
      }

      return { status, issues, metrics };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'critical',
        issues: [`Health check failed: ${error.message}`],
        metrics: null,
      };
    }
  }
}
