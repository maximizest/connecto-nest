import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PerformanceService } from '../performance.service';

/**
 * 성능 모니터링 인터셉터
 *
 * 모든 HTTP 요청의 응답 시간을 자동으로 측정하고 성능 메트릭을 수집합니다.
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const endpoint = this.getCleanEndpoint(request.route?.path || request.url);
    const userId = (request as any).user?.id;

    return next.handle().pipe(
      tap(() => {
        // 성공적인 응답 처리
        const responseTime = Date.now() - startTime;
        this.recordPerformanceMetrics(
          endpoint,
          method,
          responseTime,
          response.statusCode,
          userId,
          request,
        );
      }),
      catchError((error) => {
        // 에러 발생 시 처리
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.recordPerformanceMetrics(
          endpoint,
          method,
          responseTime,
          statusCode,
          userId,
          request,
        );

        // 에러를 다시 던짐
        throw error;
      }),
    );
  }

  /**
   * 성능 메트릭 기록
   */
  private async recordPerformanceMetrics(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: number,
    request?: Request,
  ): Promise<void> {
    try {
      // API 응답 시간 기록
      await this.performanceService.recordApiResponseTime(
        endpoint,
        method,
        responseTime,
        statusCode,
        userId,
      );

      // 추가적인 컨텍스트 메트릭 수집
      if (request) {
        await this.recordContextualMetrics(request, responseTime, statusCode);
      }
    } catch (error) {
      this.logger.error(
        `Failed to record performance metrics: ${error.message}`,
      );
    }
  }

  /**
   * 컨텍스트별 메트릭 수집
   */
  private async recordContextualMetrics(
    request: Request,
    responseTime: number,
    statusCode: number,
  ): Promise<void> {
    try {
      const endpoint = request.route?.path || request.url;

      // Travel/Planet 관련 엔드포인트 특별 처리
      if (endpoint.includes('/travels/') || endpoint.includes('/planets/')) {
        const resourceType = endpoint.includes('/travels/')
          ? 'travel'
          : 'planet';
        const resourceId = this.extractResourceId(request);

        if (resourceId) {
          // 리소스별 성능 메트릭 기록
          await this.performanceService.recordApiResponseTime(
            endpoint,
            request.method,
            responseTime,
            statusCode,
            (request as any).user?.id,
          );
        }
      }

      // 파일 업로드 엔드포인트 처리
      if (endpoint.includes('/upload') && request.method === 'POST') {
        const files = (request as any).files;
        if (files && files.length > 0) {
          for (const file of files) {
            await this.performanceService.recordFileUploadSpeed(
              file.originalname,
              file.size,
              responseTime,
              (request as any).user?.id,
              'file',
              undefined,
            );
          }
        }
      }

      // 메시지 관련 엔드포인트 처리
      if (endpoint.includes('/messages/')) {
        const planetId = this.extractPlanetId(request);
        if (planetId) {
          await this.performanceService.recordApiResponseTime(
            endpoint,
            request.method,
            responseTime,
            statusCode,
            (request as any).user?.id,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to record contextual metrics: ${error.message}`);
    }
  }

  /**
   * 엔드포인트 정리 (파라미터 제거)
   */
  private getCleanEndpoint(path: string): string {
    if (!path) return '/unknown';

    // 동적 파라미터를 일반화
    return path
      .replace(/\/\d+/g, '/:id') // 숫자 ID를 :id로 치환
      .replace(/\/[a-fA-F0-9-]{36}/g, '/:uuid') // UUID를 :uuid로 치환
      .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:token'); // 토큰을 :token으로 치환
  }

  /**
   * 리소스 ID 추출
   */
  private extractResourceId(request: Request): number | undefined {
    const params = request.params;

    // URL 파라미터에서 ID 추출
    if (params.id) {
      const id = parseInt(params.id);
      return isNaN(id) ? undefined : id;
    }

    if (params.travelId) {
      const id = parseInt(params.travelId);
      return isNaN(id) ? undefined : id;
    }

    if (params.planetId) {
      const id = parseInt(params.planetId);
      return isNaN(id) ? undefined : id;
    }

    return undefined;
  }

  /**
   * Planet ID 추출
   */
  private extractPlanetId(request: Request): number | undefined {
    const params = request.params;
    const body = request.body;

    // URL 파라미터에서 확인
    if (params.planetId) {
      const id = parseInt(params.planetId);
      return isNaN(id) ? undefined : id;
    }

    // Body에서 확인
    if (body && body.planetId) {
      const id = parseInt(body.planetId);
      return isNaN(id) ? undefined : id;
    }

    return undefined;
  }
}

/**
 * 데이터베이스 성능 모니터링 인터셉터
 *
 * TypeORM 쿼리 실행 시간을 측정합니다.
 */
@Injectable()
export class DatabasePerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DatabasePerformanceInterceptor.name);

  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - startTime;

        // 데이터베이스 작업이 1초 이상 걸린 경우에만 기록
        if (executionTime > 1000) {
          this.recordDatabasePerformance(context, executionTime);
        }
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        this.recordDatabasePerformance(context, executionTime, true);
        throw error;
      }),
    );
  }

  /**
   * 데이터베이스 성능 기록
   */
  private async recordDatabasePerformance(
    context: ExecutionContext,
    executionTime: number,
    hasError: boolean = false,
  ): Promise<void> {
    try {
      const handler = context.getHandler();
      const className = context.getClass().name;
      const methodName = handler.name;

      await this.performanceService.recordDatabaseQueryTime(
        `${className}.${methodName}`,
        executionTime,
        this.getResourceTypeFromContext(context),
      );

      if (hasError) {
        this.logger.warn(
          `Database operation failed: ${className}.${methodName} (${executionTime}ms)`,
        );
      } else if (executionTime > 5000) {
        this.logger.warn(
          `Slow database operation: ${className}.${methodName} (${executionTime}ms)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to record database performance: ${error.message}`,
      );
    }
  }

  /**
   * 컨텍스트에서 리소스 타입 추출
   */
  private getResourceTypeFromContext(
    context: ExecutionContext,
  ): string | undefined {
    const className = context.getClass().name.toLowerCase();

    if (className.includes('travel')) return 'travel';
    if (className.includes('planet')) return 'planet';
    if (className.includes('message')) return 'message';
    if (className.includes('user')) return 'user';
    if (className.includes('file')) return 'file';

    return undefined;
  }
}

/**
 * 캐시 성능 모니터링 인터셉터
 *
 * Redis 캐시 작업의 성능을 측정합니다.
 */
@Injectable()
export class CachePerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CachePerformanceInterceptor.name);

  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap((result) => {
        const executionTime = Date.now() - startTime;
        this.recordCachePerformance(
          context,
          executionTime,
          result !== undefined,
        );
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        this.recordCachePerformance(context, executionTime, false, true);
        throw error;
      }),
    );
  }

  /**
   * 캐시 성능 기록
   */
  private async recordCachePerformance(
    context: ExecutionContext,
    executionTime: number,
    isHit: boolean,
    hasError: boolean = false,
  ): Promise<void> {
    try {
      const handler = context.getHandler();
      const methodName = handler.name;

      // 캐시 히트율 계산을 위해 임시로 단순화된 방식 사용
      // 실제로는 더 정교한 추적이 필요함
      const hitRate = isHit ? 100 : 0;

      await this.performanceService.recordCacheHitRate(
        'redis',
        hitRate,
        this.getResourceTypeFromMethod(methodName),
      );

      if (hasError) {
        this.logger.warn(
          `Cache operation failed: ${methodName} (${executionTime}ms)`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to record cache performance: ${error.message}`);
    }
  }

  /**
   * 메서드명에서 리소스 타입 추출
   */
  private getResourceTypeFromMethod(methodName: string): string | undefined {
    const lowerMethodName = methodName.toLowerCase();

    if (lowerMethodName.includes('travel')) return 'travel';
    if (lowerMethodName.includes('planet')) return 'planet';
    if (lowerMethodName.includes('message')) return 'message';
    if (lowerMethodName.includes('user')) return 'user';

    return undefined;
  }
}
