import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * 표준화된 에러 응답 인터페이스
 */
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  timestamp: string;
  path: string;
  details?: unknown;
  stack?: string;
}

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
}

interface PostgresError extends Error {
  code?: string;
  detail?: string;
}

/**
 * 글로벌 예외 필터
 *
 * 모든 예외를 일관된 형태로 처리하고 로깅합니다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // 에러 로깅
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * 에러 응답 객체 구성
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // HTTP 예외 처리
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as HttpExceptionResponse;

        return {
          statusCode: status,
          message: responseObj.message || exception.message,
          error: responseObj.error || HttpStatus[status] || 'Unknown Error',
          code: responseObj.code,
          timestamp,
          path,
          details: responseObj.details,
          ...(process.env.NODE_ENV === 'development' && {
            stack: exception.stack,
          }),
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: HttpStatus[status] || 'Unknown Error',
        timestamp,
        path,
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception.stack,
        }),
      };
    }

    // TypeORM 쿼리 오류 처리
    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(exception, timestamp, path);
    }

    // 일반 에러 처리
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '서버 내부 오류가 발생했습니다.',
        error: 'Internal Server Error',
        timestamp,
        path,
        ...(process.env.NODE_ENV === 'development' && {
          details: exception.message,
          stack: exception.stack,
        }),
      };
    }

    // 알 수 없는 예외
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '알 수 없는 오류가 발생했습니다.',
      error: 'Unknown Error',
      timestamp,
      path,
      ...(process.env.NODE_ENV === 'development' && {
        details: String(exception),
      }),
    };
  }

  /**
   * 데이터베이스 오류 처리
   */
  private handleDatabaseError(
    error: QueryFailedError,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    const driverError = error.driverError as PostgresError;

    // PostgreSQL 에러 코드별 처리
    switch (driverError?.code) {
      case '23505': // unique_violation
        return {
          statusCode: HttpStatus.CONFLICT,
          message: '이미 존재하는 데이터입니다.',
          error: 'Conflict',
          code: 'DUPLICATE_ENTRY',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError.detail,
          }),
        };

      case '23503': // foreign_key_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '참조 무결성 제약 조건을 위반했습니다.',
          error: 'Bad Request',
          code: 'FOREIGN_KEY_VIOLATION',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError.detail,
          }),
        };

      case '23514': // check_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '데이터 제약 조건을 위반했습니다.',
          error: 'Bad Request',
          code: 'CHECK_VIOLATION',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError.detail,
          }),
        };

      case '23502': // not_null_violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '필수 데이터가 누락되었습니다.',
          error: 'Bad Request',
          code: 'NOT_NULL_VIOLATION',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError.detail,
          }),
        };

      case '42P01': // undefined_table
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '데이터베이스 스키마 오류가 발생했습니다.',
          error: 'Internal Server Error',
          code: 'DATABASE_SCHEMA_ERROR',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError.message,
          }),
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '데이터베이스 오류가 발생했습니다.',
          error: 'Internal Server Error',
          code: 'DATABASE_ERROR',
          timestamp,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: driverError?.message || error.message,
          }),
        };
    }
  }

  /**
   * 에러 로깅
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ) {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId =
      (request as Request & { user?: { id: string } }).user?.id || 'anonymous';

    const logContext = {
      method,
      url,
      ip,
      userAgent,
      userId,
      statusCode: errorResponse.statusCode,
      error: errorResponse.error,
      code: errorResponse.code,
      timestamp: errorResponse.timestamp,
    };

    // 에러 레벨별 로깅
    if (errorResponse.statusCode >= 500) {
      // 서버 에러 (심각)
      this.logger.error(
        `Server Error: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(logContext, null, 2),
      );
    } else if (errorResponse.statusCode >= 400) {
      // 클라이언트 에러 (경고)
      this.logger.warn(
        `Client Error: ${errorResponse.message}`,
        JSON.stringify(logContext, null, 2),
      );
    } else {
      // 기타 (정보)
      this.logger.log(
        `Request Error: ${errorResponse.message}`,
        JSON.stringify(logContext, null, 2),
      );
    }

    // 특정 에러에 대한 추가 처리
    if (exception instanceof QueryFailedError) {
      this.logger.error(
        'Database Query Failed',
        `Query: ${exception.query}`,
        `Parameters: ${JSON.stringify(exception.parameters)}`,
      );
    }
  }
}
