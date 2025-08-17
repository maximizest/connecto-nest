import { ExecutionContext } from '@nestjs/common';
import { RateLimitAction } from '../enums/rate-limit-action.enum';
import { RateLimitScope } from '../enums/rate-limit-scope.enum';

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
