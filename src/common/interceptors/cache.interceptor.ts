import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../modules/cache/redis.service';
import { CacheOptions, CacheKeyBuilder } from '../decorators/cache.decorator';

/**
 * 캐시 인터셉터
 * @Cacheable 데코레이터가 적용된 메서드의 결과를 캐시합니다
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<CacheOptions>(
      'cache',
      context.getHandler(),
    );

    // 캐시 데코레이터가 없으면 통과
    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(context, cacheOptions);

    try {
      // 캐시된 데이터 확인
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return of(JSON.parse(cachedData));
      }
    } catch (error) {
      this.logger.error(`Cache read error for key ${cacheKey}:`, error);
    }

    // 캐시 미스 - 실제 메서드 실행
    this.logger.debug(`Cache miss: ${cacheKey}`);
    return next.handle().pipe(
      tap(async (data) => {
        try {
          const ttl = cacheOptions.ttl || this.DEFAULT_TTL;
          await this.redisService.set(cacheKey, JSON.stringify(data), ttl);

          // 태그 기반 캐시 관리
          if (cacheOptions.tags) {
            for (const tag of cacheOptions.tags) {
              await this.redisService.sadd(`cache:tag:${tag}`, cacheKey);
              await this.redisService.expire(`cache:tag:${tag}`, ttl);
            }
          }

          this.logger.debug(`Cached data with key: ${cacheKey}, TTL: ${ttl}s`);
        } catch (error) {
          this.logger.error(`Cache write error for key ${cacheKey}:`, error);
        }
      }),
    );
  }

  private generateCacheKey(
    context: ExecutionContext,
    options: CacheOptions,
  ): string {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    if (options.key) {
      return CacheKeyBuilder.build(className, options.key);
    }

    // 기본 캐시 키 생성 (클래스명:메서드명:파라미터)
    const params = request.params || {};
    const query = request.query || {};
    const userId = request.user?.id || 'anonymous';

    const keyParts = [
      methodName,
      userId,
      JSON.stringify(params),
      JSON.stringify(query),
    ];

    return CacheKeyBuilder.build(className, ...keyParts);
  }
}
