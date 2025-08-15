import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { RateLimitService } from '../services/rate-limit.service';
import { AuthenticatedSocket } from '../types/authenticated-socket.interface';
import { RateLimitMetadata } from '../types/rate-limit-metadata.interface';
import { RateLimitAction, RateLimitScope } from '../types/rate-limit.types';

/**
 * WebSocket Rate Limiting Guard
 */
@Injectable()
export class WebSocketRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketRateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rate limit 메타데이터 가져오기
    const rateLimitMeta = this.reflector.get<RateLimitMetadata>(
      'rateLimit',
      context.getHandler(),
    );

    if (!rateLimitMeta) {
      // Rate limit 설정이 없으면 허용
      return true;
    }

    // 조건부 건너뛰기 확인
    if (rateLimitMeta.skipIf && rateLimitMeta.skipIf(context)) {
      return true;
    }

    try {
      // WebSocket 컨텍스트 가져오기
      const client = context.switchToWs().getClient<AuthenticatedSocket>();
      const data = context.switchToWs().getData();

      // 사용자 정보 확인
      if (!client.userId || !client.user) {
        throw new WsException('User not authenticated');
      }

      // Entity ID 추출 (Travel/Planet ID)
      let entityId: number | undefined;
      if (rateLimitMeta.extractEntityId) {
        entityId = rateLimitMeta.extractEntityId(context);
      } else {
        // 기본적으로 data에서 travelId나 planetId 추출
        entityId = data?.planetId || data?.travelId;
      }

      // 메시지 타입 추출
      let messageType: string | undefined;
      if (rateLimitMeta.extractMessageType) {
        messageType = rateLimitMeta.extractMessageType(context);
      } else {
        // 기본적으로 data에서 type 추출
        messageType = data?.type;
      }

      // Rate limit 체크
      const result = await this.rateLimitService.checkRateLimit(
        client.userId,
        rateLimitMeta.scope,
        rateLimitMeta.action,
        entityId,
        messageType,
      );

      // 허용되지 않은 경우 예외 발생
      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for user ${client.userId}: ${rateLimitMeta.scope}:${rateLimitMeta.action}`,
        );

        throw new WsException({
          message: result.message || 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
        });
      }

      // Rate limit 정보를 클라이언트에 전달 (헤더 형태로)
      if (result.remaining !== undefined) {
        client.emit('rate_limit_info', {
          scope: rateLimitMeta.scope,
          action: rateLimitMeta.action,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }

      this.logger.error(
        `Rate limit guard error: ${error.message}`,
        error.stack,
      );

      // 에러 발생 시 허용 (안전한 실패)
      return true;
    }
  }
}

/**
 * Rate Limit 데코레이터 팩토리
 */
export const RateLimit = (metadata: RateLimitMetadata) =>
  SetMetadata('rateLimit', metadata);

/**
 * 편의용 Rate Limit 데코레이터들
 */

/**
 * 메시지 전송 Rate Limit
 */
export const MessageSendRateLimit = (
  scope: RateLimitScope = RateLimitScope.PLANET,
) =>
  RateLimit({
    scope,
    action: RateLimitAction.MESSAGE_SEND,
    extractEntityId: (context) => {
      const data = context.switchToWs().getData();
      return data?.planetId;
    },
    extractMessageType: (context) => {
      const data = context.switchToWs().getData();
      return data?.type;
    },
  });

/**
 * 파일 업로드 Rate Limit
 */
export const FileUploadRateLimit = (
  scope: RateLimitScope = RateLimitScope.GLOBAL,
) =>
  RateLimit({
    scope,
    action: RateLimitAction.FILE_UPLOAD,
    extractEntityId: (context) => {
      const data = context.switchToWs().getData();
      return data?.planetId;
    },
    skipIf: (context) => {
      const data = context.switchToWs().getData();
      return data?.type === 'TEXT'; // 텍스트 메시지는 파일 업로드 제한에서 제외
    },
  });

/**
 * 타이핑 표시 Rate Limit
 */
export const TypingRateLimit = () =>
  RateLimit({
    scope: RateLimitScope.PLANET,
    action: RateLimitAction.TYPING_INDICATOR,
    extractEntityId: (context) => {
      const data = context.switchToWs().getData();
      return data?.planetId;
    },
  });

/**
 * 룸 입장 Rate Limit
 */
export const RoomJoinRateLimit = () =>
  RateLimit({
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.ROOM_JOIN,
  });

/**
 * 메시지 편집 Rate Limit
 */
export const MessageEditRateLimit = () =>
  RateLimit({
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.MESSAGE_EDIT,
  });

/**
 * 메시지 삭제 Rate Limit
 */
export const MessageDeleteRateLimit = () =>
  RateLimit({
    scope: RateLimitScope.GLOBAL,
    action: RateLimitAction.MESSAGE_DELETE,
  });

/**
 * 복합 Rate Limit (여러 제한을 동시에 적용)
 */
export const MultiRateLimit = (...limits: RateLimitMetadata[]) => {
  // 첫 번째 제한을 기본으로 사용
  return SetMetadata('rateLimit', limits[0]);
};
