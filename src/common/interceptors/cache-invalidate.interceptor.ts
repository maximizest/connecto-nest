import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../modules/cache/redis.service';

/**
 * 캐시 무효화 인터셉터
 * @CacheInvalidate 데코레이터가 적용된 메서드 실행 후 관련 캐시를 무효화합니다
 */
@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidateInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const tags = this.reflector.get<string[]>(
      'cacheInvalidate',
      context.getHandler(),
    );

    // 무효화 태그가 없으면 통과
    if (!tags || tags.length === 0) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.invalidateCacheByTags(tags);
          this.logger.debug(`Invalidated cache for tags: ${tags.join(', ')}`);
        } catch (error) {
          this.logger.error(
            `Cache invalidation error for tags ${tags.join(', ')}:`,
            error,
          );
        }
      }),
    );
  }

  private async invalidateCacheByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache:tag:${tag}`;

      // 태그에 연결된 모든 캐시 키 가져오기
      const cacheKeys = await this.redisService.smembers(tagKey);

      if (cacheKeys.length > 0) {
        // 모든 관련 캐시 삭제
        await this.redisService.del(...cacheKeys);
        this.logger.debug(
          `Deleted ${cacheKeys.length} cache keys for tag: ${tag}`,
        );
      }

      // 태그 자체도 삭제
      await this.redisService.del(tagKey);
    }
  }
}
