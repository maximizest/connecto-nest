import { ExecutionContext } from '@nestjs/common';
import { RateLimitAction, RateLimitScope } from './rate-limit.types';

/**
 * Rate Limit 메타데이터 인터페이스
 */
export interface RateLimitMetadata {
  scope: RateLimitScope;
  action: RateLimitAction;
  extractEntityId?: (context: ExecutionContext) => number | undefined;
  extractMessageType?: (context: ExecutionContext) => string | undefined;
  skipIf?: (context: ExecutionContext) => boolean;
}
