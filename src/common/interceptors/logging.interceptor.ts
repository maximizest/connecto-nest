import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

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
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
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

  private logResponse(context: LogContext, response: Response, data: any): void {
    const { requestId, method, url } = context;
    const duration = Date.now() - context.startTime;

    const logData = {
      requestId,
      type: 'RESPONSE',
      method,
      url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString(),
    };

    const logLevel = response.statusCode >= 400 ? 'warn' : 'log';
    this.logger[logLevel](`${method} ${url} ${response.statusCode} - ${duration}ms`, logData);
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
} 