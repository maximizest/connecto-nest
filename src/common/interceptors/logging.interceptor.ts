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

export interface LogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  userId?: number;
  startTime: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const logContext: LogContext = {
      requestId: this.generateRequestId(),
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip || request.connection.remoteAddress || 'unknown',
      userId: (request as any).user?.id,
      startTime: Date.now(),
    };

    // 요청 정보를 request 객체에 저장
    (request as any).logContext = logContext;

    this.logRequest(logContext, request);

    return next.handle().pipe(
      tap((data) => {
        this.logResponse(logContext, response, data);
      }),
      catchError((error) => {
        this.logError(logContext, error);
        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private logRequest(context: LogContext, request: Request): void {
    const { requestId, method, url, userAgent, ip, userId } = context;

    const logData = {
      requestId,
      type: 'REQUEST',
      method,
      url,
      userAgent,
      ip,
      userId,
      query: Object.keys(request.query).length > 0 ? request.query : undefined,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`${method} ${url}`, logData);
  }

  private logResponse(
    context: LogContext,
    response: Response,
    data: any,
  ): void {
    const { requestId, method, url } = context;
    const duration = Date.now() - context.startTime;

    const logData = {
      requestId,
      type: 'RESPONSE',
      method,
      url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      responseSize: this.getResponseSize(data),
      timestamp: new Date().toISOString(),
    };

    const logLevel = response.statusCode >= 400 ? 'warn' : 'log';
    this.logger[logLevel](
      `${method} ${url} ${response.statusCode} - ${duration}ms`,
      logData,
    );
  }

  private logError(context: LogContext, error: any): void {
    const { requestId, method, url } = context;
    const duration = Date.now() - context.startTime;

    const logData = {
      requestId,
      type: 'ERROR',
      method,
      url,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`${method} ${url} - ERROR after ${duration}ms`, logData);
  }

  /**
   * 순환 참조를 안전하게 처리하여 응답 크기를 계산합니다.
   */
  private getResponseSize(data: any): string {
    if (data === null || data === undefined) {
      return '0 bytes';
    }

    try {
      const jsonString = JSON.stringify(data);
      return `${jsonString.length} bytes`;
    } catch (error) {
      // 순환 참조나 기타 JSON.stringify 에러가 발생한 경우
      if (
        error instanceof TypeError &&
        error.message.includes('circular structure')
      ) {
        return 'circular reference detected';
      }

      // 다른 타입의 데이터인 경우 대략적인 크기 추정
      if (typeof data === 'string') {
        return `~${data.length} bytes`;
      }

      if (typeof data === 'object') {
        const keyCount = Object.keys(data).length;
        return `object with ${keyCount} keys`;
      }

      return 'unknown size';
    }
  }
}
