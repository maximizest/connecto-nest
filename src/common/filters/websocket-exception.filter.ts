import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface HttpExceptionResponse {
  message?: string;
  code?: string;
}

interface ExtendedSocket extends Socket {
  userId?: string;
}

/**
 * WebSocket 예외 필터
 */
@Catch()
export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WebSocketExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();

    const errorResponse = this.buildErrorResponse(exception);

    // 에러 로깅
    this.logError(exception, client, data);

    // 클라이언트에게 에러 전송
    client.emit('error', errorResponse);
  }

  /**
   * 에러 응답 구성
   */
  private buildErrorResponse(exception: unknown) {
    const timestamp = new Date().toISOString();

    // WebSocket 예외 처리
    if (exception instanceof WsException) {
      return {
        type: 'WS_ERROR',
        message: exception.message,
        timestamp,
        code: 'WEBSOCKET_ERROR',
      };
    }

    // HTTP 예외를 WebSocket 형태로 변환
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let message = exception.message;
      let code = 'HTTP_ERROR';

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as HttpExceptionResponse;
        message = responseObj.message || message;
        code = responseObj.code || code;
      }

      return {
        type: 'ERROR',
        message,
        statusCode: status,
        code,
        timestamp,
      };
    }

    // 일반 에러 처리
    if (exception instanceof Error) {
      return {
        type: 'ERROR',
        message: '서버 오류가 발생했습니다.',
        timestamp,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          details: exception.message,
        }),
      };
    }

    // 알 수 없는 예외
    return {
      type: 'ERROR',
      message: '알 수 없는 오류가 발생했습니다.',
      timestamp,
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * 에러 로깅
   */
  private logError(exception: unknown, client: Socket, data: unknown) {
    const userId = (client as ExtendedSocket).userId || 'anonymous';
    const clientId = client.id;

    const logContext = {
      userId,
      clientId,
      eventData: data as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status >= 500) {
        this.logger.error(
          `WebSocket Server Error: ${exception.message}`,
          exception.stack,
          JSON.stringify(logContext, null, 2),
        );
      } else {
        this.logger.warn(
          `WebSocket Client Error: ${exception.message}`,
          JSON.stringify(logContext, null, 2),
        );
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `WebSocket Error: ${exception.message}`,
        exception.stack,
        JSON.stringify(logContext, null, 2),
      );
    } else {
      this.logger.error(
        `WebSocket Unknown Error: ${String(exception)}`,
        JSON.stringify(logContext, null, 2),
      );
    }
  }
}
