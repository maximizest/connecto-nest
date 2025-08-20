import { RedisService } from '../../src/modules/cache/redis.service';

/**
 * Redis 캐시 정리 헬퍼
 * 테스트 간 Redis 캐시 상태를 초기화하여 테스트 격리를 보장
 */
export class RedisCleaner {
  constructor(private redisService: RedisService) {}

  /**
   * 모든 Redis 키 삭제 (현재 DB만)
   */
  async flushCurrentDb(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (client) {
        await client.flushdb();
      }
    } catch (error) {
      // Redis 연결 실패 시 조용히 무시 (테스트 환경에서 Redis가 선택사항일 수 있음)
      console.warn(
        'Redis flush failed (continuing without cache cleanup):',
        error.message,
      );
    }
  }

  /**
   * 모든 Redis 인스턴스의 모든 DB 삭제 (주의: 전체 Redis 서버 영향)
   */
  async flushAllDbs(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (client) {
        await client.flushall();
      }
    } catch (error) {
      console.warn(
        'Redis flushall failed (continuing without cache cleanup):',
        error.message,
      );
    }
  }

  /**
   * 패턴에 맞는 키들만 삭제
   */
  async deleteKeysByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redisService.getKeys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const client = this.redisService.getClient();
      if (client && keys.length > 0) {
        await client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.warn(
        `Redis pattern delete failed for pattern ${pattern}:`,
        error.message,
      );
      return 0;
    }
  }

  /**
   * 특정 키들 삭제
   */
  async deleteKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    try {
      const client = this.redisService.getClient();
      if (client) {
        return await client.del(...keys);
      }
      return 0;
    } catch (error) {
      console.warn(
        `Redis keys delete failed for keys ${keys.join(', ')}:`,
        error.message,
      );
      return 0;
    }
  }

  /**
   * 테스트 관련 캐시 키들 정리
   */
  async cleanTestCache(): Promise<void> {
    const patterns = [
      'test:*', // 테스트 접두사
      'session:test:*', // 테스트 세션
      'cache:test:*', // 테스트 캐시
      'presence:test:*', // 테스트 온라인 상태
      'typing:test:*', // 테스트 타이핑 상태
      'room:test:*', // 테스트 룸
    ];

    for (const pattern of patterns) {
      await this.deleteKeysByPattern(pattern);
    }
  }

  /**
   * 채팅 관련 캐시 정리
   */
  async cleanChatCache(): Promise<void> {
    const patterns = [
      'travel:*', // 여행 캐시
      'planet:*', // 플래닛 캐시
      'message:*', // 메시지 캐시
      'presence:*', // 온라인 상태
      'typing:*', // 타이핑 상태
      'room:*', // 채팅룸
      'metrics:*', // 메트릭스
    ];

    for (const pattern of patterns) {
      await this.deleteKeysByPattern(pattern);
    }
  }

  /**
   * 사용자 세션 캐시 정리
   */
  async cleanUserSessions(): Promise<void> {
    await this.deleteKeysByPattern('session:*');
    await this.deleteKeysByPattern('auth:*');
    await this.deleteKeysByPattern('refresh:*');
  }

  /**
   * Redis 연결 상태 확인
   */
  async isConnected(): Promise<boolean> {
    try {
      return await this.redisService.healthCheck();
    } catch (_error) {
      return false;
    }
  }

  /**
   * Redis 정보 가져오기 (디버깅용)
   */
  async getInfo(): Promise<Record<string, any>> {
    try {
      const info = await this.redisService.getInfo();
      const client = this.redisService.getClient();
      let dbSize = 0;

      if (client) {
        dbSize = await client.dbsize();
      }

      return {
        connected: true,
        dbSize,
        info,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}

/**
 * 간편한 Redis 정리 함수들
 */
export const createRedisCleaner = (
  redisService: RedisService,
): RedisCleaner => {
  return new RedisCleaner(redisService);
};

/**
 * 전체 Redis DB 정리 (가장 자주 사용)
 */
export const cleanRedisCache = async (
  redisService: RedisService,
): Promise<void> => {
  const cleaner = new RedisCleaner(redisService);
  await cleaner.flushCurrentDb();
};

/**
 * 테스트 관련 캐시만 정리
 */
export const cleanTestRedisCache = async (
  redisService: RedisService,
): Promise<void> => {
  const cleaner = new RedisCleaner(redisService);
  await cleaner.cleanTestCache();
};
