import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 레플리카 인식 로깅 인터셉터
 * 
 * 로그에 레플리카 ID를 포함하여 어느 인스턴스에서 발생한 로그인지 추적
 */
@Injectable()
export class ReplicaAwareLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly replicaId = process.env.RAILWAY_REPLICA_ID || 'single';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    // 요청 로그 (레플리카 ID 포함)
    this.logger.log(
      `[${this.replicaId}] ${method} ${url} - ${ip} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          // 응답 로그 (레플리카 ID 포함)
          this.logger.log(
            `[${this.replicaId}] ${method} ${url} - ${statusCode} - ${responseTime}ms`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          
          // 에러 로그 (레플리카 ID 포함)
          this.logger.error(
            `[${this.replicaId}] ${method} ${url} - ${error.status || 500} - ${responseTime}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}