import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { CacheKeyBuilder } from '../../../common/decorators/cache.decorator';

/**
 * 엔티티별 캐싱 전략
 */
@Injectable()
export class CacheStrategy {
  private readonly logger = new Logger(CacheStrategy.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Travel 캐싱 전략
   * - 공개 여행 목록: 5분 캐시
   * - 개별 여행 정보: 10분 캐시
   * - 여행 참여자 목록: 3분 캐시
   */
  async cacheTravelList(data: any, visibility: string): Promise<void> {
    const key = CacheKeyBuilder.build('travel', 'list', visibility);
    await this.redisService.set(key, JSON.stringify(data), 300); // 5분
  }

  async getCachedTravelList(visibility: string): Promise<any> {
    const key = CacheKeyBuilder.build('travel', 'list', visibility);
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheTravel(travelId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build('travel', travelId.toString());
    await this.redisService.set(key, JSON.stringify(data), 600); // 10분
  }

  async getCachedTravel(travelId: number): Promise<any> {
    const key = CacheKeyBuilder.build('travel', travelId.toString());
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateTravelCache(travelId: number): Promise<void> {
    const keys = [
      CacheKeyBuilder.build('travel', travelId.toString()),
      CacheKeyBuilder.build('travel', 'list', '*'),
      CacheKeyBuilder.build('travel', 'members', travelId.toString()),
    ];

    for (const pattern of keys) {
      if (pattern.includes('*')) {
        const matchedKeys = await this.redisService.keys(pattern);
        if (matchedKeys.length > 0) {
          await this.redisService.del(...matchedKeys);
        }
      } else {
        await this.redisService.del(pattern);
      }
    }
  }

  /**
   * Planet (채팅방) 캐싱 전략
   * - 채팅방 정보: 10분 캐시
   * - 채팅방 멤버 목록: 2분 캐시
   * - 최근 메시지: 30초 캐시
   */
  async cachePlanet(planetId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build('planet', planetId.toString());
    await this.redisService.set(key, JSON.stringify(data), 600); // 10분
  }

  async getCachedPlanet(planetId: number): Promise<any> {
    const key = CacheKeyBuilder.build('planet', planetId.toString());
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cachePlanetMembers(planetId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build('planet', 'members', planetId.toString());
    await this.redisService.set(key, JSON.stringify(data), 120); // 2분
  }

  async getCachedPlanetMembers(planetId: number): Promise<any> {
    const key = CacheKeyBuilder.build('planet', 'members', planetId.toString());
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheRecentMessages(planetId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build(
      'planet',
      'messages',
      planetId.toString(),
    );
    await this.redisService.set(key, JSON.stringify(data), 30); // 30초
  }

  async getCachedRecentMessages(planetId: number): Promise<any> {
    const key = CacheKeyBuilder.build(
      'planet',
      'messages',
      planetId.toString(),
    );
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidatePlanetCache(planetId: number): Promise<void> {
    const keys = [
      CacheKeyBuilder.build('planet', planetId.toString()),
      CacheKeyBuilder.build('planet', 'members', planetId.toString()),
      CacheKeyBuilder.build('planet', 'messages', planetId.toString()),
    ];

    await this.redisService.del(...keys);
  }

  /**
   * User 캐싱 전략
   * - 사용자 프로필: 15분 캐시
   * - 온라인 상태: 실시간 (캐시하지 않음)
   * - 사용자 권한: 5분 캐시
   */
  async cacheUserProfile(userId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build('user', 'profile', userId.toString());
    await this.redisService.set(key, JSON.stringify(data), 900); // 15분
  }

  async getCachedUserProfile(userId: number): Promise<any> {
    const key = CacheKeyBuilder.build('user', 'profile', userId.toString());
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheUserPermissions(userId: number, data: any): Promise<void> {
    const key = CacheKeyBuilder.build('user', 'permissions', userId.toString());
    await this.redisService.set(key, JSON.stringify(data), 300); // 5분
  }

  async getCachedUserPermissions(userId: number): Promise<any> {
    const key = CacheKeyBuilder.build('user', 'permissions', userId.toString());
    const cached = await this.redisService.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateUserCache(userId: number): Promise<void> {
    const keys = [
      CacheKeyBuilder.build('user', 'profile', userId.toString()),
      CacheKeyBuilder.build('user', 'permissions', userId.toString()),
    ];

    await this.redisService.del(...keys);
  }

  /**
   * 전체 캐시 무효화 (관리자용)
   */
  async invalidateAllCache(): Promise<void> {
    const pattern = 'cache:*';
    const keys = await this.redisService.keys(pattern);

    if (keys.length > 0) {
      const chunks = this.chunkArray(keys, 1000); // 1000개씩 나누어 삭제
      for (const chunk of chunks) {
        await this.redisService.del(...chunk);
      }
      this.logger.log(`Invalidated ${keys.length} cache keys`);
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    patterns: { [key: string]: number };
  }> {
    const info = await this.redisService.info('memory');
    const keys = await this.redisService.keys('cache:*');

    const patterns: { [key: string]: number } = {};
    for (const key of keys) {
      const prefix = key.split(':')[1] || 'unknown';
      patterns[prefix] = (patterns[prefix] || 0) + 1;
    }

    return {
      totalKeys: keys.length,
      memoryUsage: this.extractMemoryUsage(info),
      patterns,
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private extractMemoryUsage(info: string): string {
    const match = info.match(/used_memory_human:(.+)/);
    return match ? match[1].trim() : 'unknown';
  }
}
