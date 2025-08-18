import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';
import { RedisService } from '../../modules/cache/redis.service';

/**
 * 분산 Rate Limiting Guard
 * 
 * Redis를 사용하여 모든 레플리카에서 공유되는 Rate Limit 구현
 */
@Injectable()
export class DistributedThrottlerGuard extends ThrottlerGuard {
  constructor(
    private readonly redisService: RedisService,
    options: ThrottlerOptions,
  ) {
    super(options);
  }

  /**
   * Rate Limit 체크 (Redis 기반)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);
    const ttl = this.options.ttl;
    const limit = this.options.limit;

    // Redis에서 현재 카운트 조회
    const current = await this.redisService.incr(key);
    
    // 첫 요청인 경우 TTL 설정
    if (current === 1) {
      await this.redisService.expire(key, ttl);
    }

    // Rate Limit 초과 체크
    if (current > limit) {
      return false;
    }

    return true;
  }

  /**
   * Rate Limit 키 생성
   */
  private generateKey(request: any): string {
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id || 'anonymous';
    const path = request.route?.path || request.url;
    
    return `rate-limit:${userId}:${ip}:${path}`;
  }
}