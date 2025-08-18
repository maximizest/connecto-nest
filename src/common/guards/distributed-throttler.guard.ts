import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RedisService } from '../../modules/cache/redis.service';
import { Reflector } from '@nestjs/core';

/**
 * 분산 Rate Limiting Guard
 *
 * Redis를 사용하여 모든 레플리카에서 공유되는 Rate Limit 구현
 */
@Injectable()
export class DistributedThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(Reflector) protected readonly reflector: Reflector,
  ) {
    super(
      {
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
      },
      {
        async increment(
          key: string,
          ttl: number,
          limit: number,
          blockDuration: number,
          throttlerName: string,
        ) {
          return {
            totalHits: 1,
            timeToExpire: ttl,
            isBlocked: false,
            timeToBlockExpire: 0,
          };
        },
      },
      reflector,
    );
  }

  /**
   * Rate Limit 체크 (Redis 기반)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get throttle options from decorator or use defaults
    const limit =
      this.reflector.getAllAndOverride<number>('throttle:limit', [
        context.getHandler(),
        context.getClass(),
      ]) || 100;

    const ttl =
      this.reflector.getAllAndOverride<number>('throttle:ttl', [
        context.getHandler(),
        context.getClass(),
      ]) || 60;

    const key = this.generateKey(context, request);

    // Redis에서 현재 카운트 조회
    const current = await this.redisService.incr(key);

    // 첫 요청인 경우 TTL 설정
    if (current === 1) {
      await this.redisService.expire(key, ttl);
    }

    // 남은 시간 조회
    const ttlRemaining = await this.redisService.ttl(key);

    // Response headers 설정
    response.header('X-RateLimit-Limit', limit);
    response.header('X-RateLimit-Remaining', Math.max(0, limit - current));
    response.header(
      'X-RateLimit-Reset',
      new Date(Date.now() + ttlRemaining * 1000).toISOString(),
    );

    // Rate Limit 초과 체크
    if (current > limit) {
      response.header('Retry-After', ttlRemaining);
      return false;
    }

    return true;
  }

  /**
   * Rate Limit 키 생성
   */
  protected generateKey(context: ExecutionContext, request: any): string {
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userId = request.user?.id || 'anonymous';
    const handler = context.getHandler().name;
    const className = context.getClass().name;

    return `rate-limit:${className}:${handler}:${userId}:${ip}`;
  }
}
