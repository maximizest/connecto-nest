import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../../guards/admin.guard';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  MetricCategory,
  MetricType,
  PerformanceAlert,
  PerformanceMetric,
} from '../../performance.entity';
import { PerformanceService } from '../../performance.service';

interface PerformanceQueryDto {
  type?: MetricType;
  category?: MetricCategory;
  resourceType?: string;
  resourceId?: number;
  hours?: number;
}

interface MetricRecordDto {
  type: MetricType;
  value: number;
  unit?: string;
  resourceType?: string;
  resourceId?: number;
  metadata?: any;
}

/**
 * 성능 모니터링 API 컨트롤러
 *
 * @foryourdev/nestjs-crud 기반 성능 메트릭 CRUD와
 * 성능 모니터링 전용 기능을 제공합니다.
 */
@Controller({ path: 'performance', version: '1' })
@Crud({
  entity: PerformanceMetric,
  allowedFilters: [
    'type',
    'category',
    'resourceType',
    'resourceId',
    'value',
    'unit',
    'createdAt',
  ],
  allowedParams: [
    'type',
    'category',
    'value',
    'unit',
    'resourceType',
    'resourceId',
    'metadata',
  ],
  allowedIncludes: [],
  only: ['index', 'show'],
  routes: {
    index: {
      allowedFilters: [
        'type',
        'category',
        'resourceType',
        'resourceId',
        'value_gt',
        'value_lt',
        'createdAt_gt',
        'createdAt_lt',
      ],
    },
    show: {
      allowedIncludes: [],
    },
  },
})
@UseGuards(AuthGuard)
export class PerformanceController {
  constructor(public readonly crudService: PerformanceService) {}

  /**
   * 성능 메트릭 생성 전 전처리
   */
  @BeforeCreate()
  async preprocessCreateMetric(body: any, context: any) {
    // 카테고리 자동 설정
    if (body.type && !body.category) {
      body.category = this.getMetricCategory(body.type);
    }

    // 기본 단위 설정
    if (body.type && !body.unit) {
      body.unit = this.getDefaultUnit(body.type);
    }

    // 메타데이터 기본값 설정
    if (!body.metadata) {
      body.metadata = {};
    }
    body.metadata.createdBy = 'system';
    body.metadata.source = 'api';

    return body;
  }

  /**
   * 성능 메트릭 업데이트 전 전처리
   */
  @BeforeUpdate()
  async preprocessUpdateMetric(body: any, context: any) {
    // 메트릭 업데이트는 일반적으로 허용되지 않음
    throw new Error(
      '성능 메트릭은 수정할 수 없습니다. 새로운 메트릭을 생성해주세요.',
    );
  }

  /**
   * 메트릭 카테고리 결정
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
   * 성능 메트릭 조회
   */
  @Get('metrics')
  async getMetrics(@Query() query: PerformanceQueryDto): Promise<{
    metrics: PerformanceMetric[];
    count: number;
  }> {
    const { type, category, resourceType, resourceId, hours = 24 } = query;

    const metrics = await this.crudService.getMetrics(
      type,
      category,
      resourceType,
      resourceId,
      hours,
    );

    return {
      metrics,
      count: metrics.length,
    };
  }

  /**
   * 성능 통계 조회
   */
  @Get('stats')
  async getPerformanceStats(@Query() query: PerformanceQueryDto): Promise<{
    overall: any;
    byType: any[];
    byCategory: any[];
  }> {
    const { hours = 24 } = query;

    // 전체 통계
    const overall = await this.crudService.getPerformanceStats(
      undefined,
      hours,
    );

    // 타입별 통계
    const metricTypes = Object.values(MetricType);
    const byType = await Promise.all(
      metricTypes.map(async (type) => {
        const stats = await this.crudService.getPerformanceStats(type, hours);
        return { type, ...stats };
      }),
    );

    // 카테고리별 통계 (간단화)
    const byCategory = Object.values(MetricCategory).map((category) => ({
      category,
      avg: 0,
      count: 0,
      performanceScore: 100,
    }));

    return {
      overall,
      byType: byType.filter((stat) => stat.count > 0),
      byCategory,
    };
  }

  /**
   * 실시간 성능 대시보드 데이터
   */
  @Get('dashboard')
  async getDashboardData(): Promise<{
    summary: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      performanceScore: number;
    };
    realtime: {
      apiResponseTimes: any[];
      systemUsage: any;
      activeAlerts: number;
      topSlowEndpoints: any[];
    };
    trends: {
      hourly: any[];
      daily: any[];
    };
  }> {
    const [apiStats, errorStats, systemMetrics, activeAlerts] =
      await Promise.all([
        this.crudService.getPerformanceStats(MetricType.API_RESPONSE_TIME, 1),
        this.crudService.getPerformanceStats(MetricType.ERROR_RATE, 1),
        this.crudService.getMetrics(
          MetricType.MEMORY_USAGE,
          undefined,
          undefined,
          undefined,
          1,
        ),
        this.crudService.getActiveAlerts(),
      ]);

    return {
      summary: {
        totalRequests: apiStats.count,
        avgResponseTime: apiStats.avg,
        errorRate: errorStats.avg,
        performanceScore: apiStats.performanceScore,
      },
      realtime: {
        apiResponseTimes: await this.getRecentApiResponseTimes(),
        systemUsage: this.formatSystemUsage(systemMetrics),
        activeAlerts: activeAlerts.length,
        topSlowEndpoints: await this.getTopSlowEndpoints(),
      },
      trends: {
        hourly: await this.getHourlyTrends(24),
        daily: await this.getDailyTrends(7),
      },
    };
  }

  /**
   * Travel 성능 모니터링
   */
  @Get('travel/:travelId')
  async getTravelPerformance(
    @Param('travelId', ParseIntPipe) travelId: number,
    @Query('hours') hours: number = 24,
  ): Promise<{
    travel: {
      id: number;
      apiMetrics: any;
      messageMetrics: any;
      fileMetrics: any;
      userActivity: any;
    };
  }> {
    const [apiMetrics, messageMetrics, fileMetrics] = await Promise.all([
      this.crudService.getMetrics(
        MetricType.API_RESPONSE_TIME,
        undefined,
        'travel',
        travelId,
        hours,
      ),
      this.crudService.getMetrics(
        MetricType.API_RESPONSE_TIME,
        undefined,
        'message',
        undefined,
        hours,
      ),
      this.crudService.getMetrics(
        MetricType.FILE_UPLOAD_SPEED,
        undefined,
        'travel',
        travelId,
        hours,
      ),
    ]);

    return {
      travel: {
        id: travelId,
        apiMetrics: this.calculateMetricsStats(apiMetrics),
        messageMetrics: this.calculateMetricsStats(messageMetrics),
        fileMetrics: this.calculateMetricsStats(fileMetrics),
        userActivity: {
          totalRequests: apiMetrics.length,
          uniqueUsers: this.countUniqueUsers(apiMetrics),
        },
      },
    };
  }

  /**
   * Planet 성능 모니터링
   */
  @Get('planet/:planetId')
  async getPlanetPerformance(
    @Param('planetId', ParseIntPipe) planetId: number,
    @Query('hours') hours: number = 24,
  ): Promise<{
    planet: {
      id: number;
      messageMetrics: any;
      userActivity: any;
      responseTimeAnalysis: any;
    };
  }> {
    const messageMetrics = await this.crudService.getMetrics(
      MetricType.API_RESPONSE_TIME,
      undefined,
      'planet',
      planetId,
      hours,
    );

    return {
      planet: {
        id: planetId,
        messageMetrics: this.calculateMetricsStats(messageMetrics),
        userActivity: {
          totalRequests: messageMetrics.length,
          uniqueUsers: this.countUniqueUsers(messageMetrics),
          avgRequestsPerUser:
            messageMetrics.length /
            Math.max(1, this.countUniqueUsers(messageMetrics)),
        },
        responseTimeAnalysis: this.analyzeResponseTimes(messageMetrics),
      },
    };
  }

  /**
   * 대용량 파일 처리 성능 모니터링
   */
  @Get('file-processing')
  async getFileProcessingPerformance(
    @Query('hours') hours: number = 24,
  ): Promise<{
    uploadStats: any;
    processingStats: any;
    storageStats: any;
    topLargeFiles: any[];
  }> {
    const [uploadMetrics, processingMetrics] = await Promise.all([
      this.crudService.getMetrics(
        MetricType.FILE_UPLOAD_SPEED,
        undefined,
        undefined,
        undefined,
        hours,
      ),
      this.crudService.getMetrics(
        MetricType.FILE_PROCESSING_TIME,
        undefined,
        undefined,
        undefined,
        hours,
      ),
    ]);

    return {
      uploadStats: this.calculateFileUploadStats(uploadMetrics),
      processingStats: this.calculateFileProcessingStats(processingMetrics),
      storageStats: {
        totalFilesProcessed: processingMetrics.length,
        avgProcessingTime:
          processingMetrics.reduce((sum, m) => sum + m.value, 0) /
          Math.max(1, processingMetrics.length),
      },
      topLargeFiles: this.getTopLargeFiles(uploadMetrics),
    };
  }

  /**
   * 성능 알람 조회
   */
  @Get('alerts')
  async getAlerts(@Query('severity') severity?: string): Promise<{
    alerts: PerformanceAlert[];
    count: number;
    summary: {
      total: number;
      bySeverity: any;
    };
  }> {
    const alerts = await this.crudService.getActiveAlerts(severity);

    const summary = {
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter((a) => a.severity === 'critical').length,
        high: alerts.filter((a) => a.severity === 'high').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        low: alerts.filter((a) => a.severity === 'low').length,
      },
    };

    return {
      alerts,
      count: alerts.length,
      summary,
    };
  }

  /**
   * 성능 알람 해결
   */
  @Post('alerts/:alertId/resolve')
  @UseGuards(AdminGuard)
  async resolveAlert(@Param('alertId', ParseIntPipe) alertId: number): Promise<{
    message: string;
  }> {
    await this.crudService.resolveAlert(alertId);
    return { message: '알람이 해결되었습니다.' };
  }

  /**
   * 성능 메트릭 수동 기록 (테스트용)
   */
  @Post('metrics')
  @UseGuards(AdminGuard)
  async recordMetric(@Body() data: MetricRecordDto): Promise<{
    message: string;
  }> {
    await this.crudService.recordMetric(data);
    return { message: '성능 메트릭이 기록되었습니다.' };
  }

  /**
   * 성능 리포트 생성
   */
  @Get('report')
  @UseGuards(AdminGuard)
  async generatePerformanceReport(@Query('hours') hours: number = 24): Promise<{
    report: {
      summary: any;
      details: any;
      recommendations: string[];
      generatedAt: Date;
    };
  }> {
    const [overallStats, apiStats, dbStats, fileStats, errorStats] =
      await Promise.all([
        this.crudService.getPerformanceStats(undefined, hours),
        this.crudService.getPerformanceStats(
          MetricType.API_RESPONSE_TIME,
          hours,
        ),
        this.crudService.getPerformanceStats(
          MetricType.DATABASE_QUERY_TIME,
          hours,
        ),
        this.crudService.getPerformanceStats(
          MetricType.FILE_UPLOAD_SPEED,
          hours,
        ),
        this.crudService.getPerformanceStats(MetricType.ERROR_RATE, hours),
      ]);

    const recommendations = this.generateRecommendations({
      apiStats,
      dbStats,
      fileStats,
      errorStats,
    });

    return {
      report: {
        summary: {
          overallScore: overallStats.performanceScore,
          totalRequests: apiStats.count,
          avgResponseTime: apiStats.avg,
          errorRate: errorStats.avg,
          period: `${hours}시간`,
        },
        details: {
          api: apiStats,
          database: dbStats,
          fileProcessing: fileStats,
          errors: errorStats,
        },
        recommendations,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * 최근 API 응답 시간 조회
   */
  private async getRecentApiResponseTimes(): Promise<any[]> {
    const metrics = await this.crudService.getMetrics(
      MetricType.API_RESPONSE_TIME,
      undefined,
      undefined,
      undefined,
      1, // 최근 1시간
    );

    return metrics.slice(0, 50).map((m) => ({
      timestamp: m.createdAt,
      value: m.value,
      endpoint: m.metadata?.endpoint,
      method: m.metadata?.method,
    }));
  }

  /**
   * 시스템 사용량 포맷팅
   */
  private formatSystemUsage(metrics: PerformanceMetric[]): any {
    const latest = metrics[0];
    return {
      memory: latest?.value || 0,
      cpu: 0, // CPU 메트릭이 있다면 추가
      disk: 0, // 디스크 메트릭이 있다면 추가
      timestamp: latest?.createdAt || new Date(),
    };
  }

  /**
   * 가장 느린 엔드포인트 조회
   */
  private async getTopSlowEndpoints(): Promise<any[]> {
    const metrics = await this.crudService.getMetrics(
      MetricType.API_RESPONSE_TIME,
      undefined,
      undefined,
      undefined,
      24,
    );

    // 엔드포인트별로 그룹화하고 평균 응답 시간 계산
    const endpointStats = new Map<
      string,
      { total: number; count: number; max: number }
    >();

    metrics.forEach((metric) => {
      const endpoint = metric.metadata?.endpoint || 'unknown';
      const current = endpointStats.get(endpoint) || {
        total: 0,
        count: 0,
        max: 0,
      };

      current.total += metric.value;
      current.count += 1;
      current.max = Math.max(current.max, metric.value);

      endpointStats.set(endpoint, current);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgResponseTime: stats.total / stats.count,
        maxResponseTime: stats.max,
        requestCount: stats.count,
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);
  }

  /**
   * 시간별 트렌드 조회
   */
  private async getHourlyTrends(hours: number): Promise<any[]> {
    // 간단화된 구현 - 실제로는 더 정교한 시계열 분석이 필요
    const metrics = await this.crudService.getMetrics(
      MetricType.API_RESPONSE_TIME,
      undefined,
      undefined,
      undefined,
      hours,
    );

    return []; // 구현 필요
  }

  /**
   * 일별 트렌드 조회
   */
  private async getDailyTrends(days: number): Promise<any[]> {
    // 간단화된 구현
    return [];
  }

  /**
   * 메트릭 통계 계산
   */
  private calculateMetricsStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const values = metrics.map((m) => m.value);
    return {
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  /**
   * 고유 사용자 수 계산
   */
  private countUniqueUsers(metrics: PerformanceMetric[]): number {
    const userIds = new Set(
      metrics.map((m) => m.metadata?.userId).filter((id) => id !== undefined),
    );
    return userIds.size;
  }

  /**
   * 응답 시간 분석
   */
  private analyzeResponseTimes(metrics: PerformanceMetric[]): any {
    const values = metrics.map((m) => m.value);
    if (values.length === 0) return { fast: 0, normal: 0, slow: 0 };

    return {
      fast: values.filter((v) => v < 1000).length, // 1초 미만
      normal: values.filter((v) => v >= 1000 && v < 5000).length, // 1-5초
      slow: values.filter((v) => v >= 5000).length, // 5초 이상
    };
  }

  /**
   * 파일 업로드 통계 계산
   */
  private calculateFileUploadStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) {
      return { avgSpeed: 0, totalFiles: 0, totalSize: 0 };
    }

    const totalSize = metrics.reduce(
      (sum, m) => sum + (m.metadata?.fileSize || 0),
      0,
    );
    const avgSpeed =
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

    return {
      avgSpeed,
      totalFiles: metrics.length,
      totalSize: totalSize / (1024 * 1024), // MB 단위
    };
  }

  /**
   * 파일 처리 통계 계산
   */
  private calculateFileProcessingStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) {
      return { avgProcessingTime: 0, totalProcessed: 0 };
    }

    const avgTime =
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

    return {
      avgProcessingTime: avgTime,
      totalProcessed: metrics.length,
    };
  }

  /**
   * 대용량 파일 상위 목록
   */
  private getTopLargeFiles(metrics: PerformanceMetric[]): any[] {
    return metrics
      .filter((m) => m.metadata?.fileSize)
      .sort((a, b) => (b.metadata?.fileSize || 0) - (a.metadata?.fileSize || 0))
      .slice(0, 10)
      .map((m) => ({
        fileName: m.metadata?.fileName,
        fileSize: (m.metadata?.fileSize || 0) / (1024 * 1024), // MB
        uploadSpeed: m.value,
        timestamp: m.createdAt,
      }));
  }

  /**
   * 성능 개선 추천사항 생성
   */
  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.apiStats.avg > 5000) {
      recommendations.push(
        'API 응답 시간이 5초를 초과합니다. 쿼리 최적화나 캐싱 도입을 검토해보세요.',
      );
    }

    if (stats.dbStats.avg > 1000) {
      recommendations.push(
        '데이터베이스 쿼리가 느립니다. 인덱스 추가나 쿼리 최적화를 고려해보세요.',
      );
    }

    if (stats.fileStats.avg < 1) {
      recommendations.push(
        '파일 업로드 속도가 1MB/s 미만입니다. 네트워크나 스토리지 성능을 확인해보세요.',
      );
    }

    if (stats.errorStats.avg > 5) {
      recommendations.push(
        '에러율이 5%를 초과합니다. 에러 원인을 분석하고 안정성 개선이 필요합니다.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '현재 성능 상태가 양호합니다. 지속적인 모니터링을 유지하세요.',
      );
    }

    return recommendations;
  }
}
