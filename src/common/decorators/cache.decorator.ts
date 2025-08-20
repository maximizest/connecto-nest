import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
}

/**
 * 캐시 데코레이터
 * 메서드 결과를 Redis에 캐시합니다
 */
export const Cacheable = (options?: CacheOptions) =>
  SetMetadata('cache', options || {});

/**
 * 캐시 무효화 데코레이터
 * 특정 태그의 캐시를 무효화합니다
 */
export const CacheInvalidate = (tags: string[]) =>
  SetMetadata('cacheInvalidate', tags);

/**
 * 캐시 키 생성 유틸리티
 */
export class CacheKeyBuilder {
  static build(prefix: string, ...parts: (string | number)[]): string {
    return `cache:${prefix}:${parts.join(':')}`;
  }

  static buildPattern(prefix: string, pattern: string): string {
    return `cache:${prefix}:${pattern}`;
  }
}
