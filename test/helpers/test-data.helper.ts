import { DataSource } from 'typeorm';
import { RedisService } from '../../src/modules/cache/redis.service';
import {} from '../factories/message.factory';
import {} from '../factories/planet.factory';
import { DatabaseCleaner, cleanDatabase } from './database-cleaner.helper';
import { RedisCleaner, cleanRedisCache } from './redis-cleaner.helper';

/**
 * 통합 테스트 데이터 관리 헬퍼
 * Fishery Factory와 데이터 정리 기능을 통합하여 제공
 */
export class TestDataManager {
  private databaseCleaner: DatabaseCleaner;
  private redisCleaner: RedisCleaner;

  constructor(
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {
    this.databaseCleaner = new DatabaseCleaner(dataSource);
    this.redisCleaner = new RedisCleaner(redisService);
  }

  /**
   * 모든 데이터 정리 (데이터베이스 + Redis)
   */
  async cleanAll(): Promise<void> {
    await Promise.all([
      this.databaseCleaner.cleanAll(),
      this.redisCleaner.flushCurrentDb(),
    ]);
  }

  /**
   * 데이터베이스만 정리
   */
  async cleanDatabase(): Promise<void> {
    await this.databaseCleaner.cleanAll();
  }

  /**
   * Redis 캐시만 정리
   */
  async cleanCache(): Promise<void> {
    await this.redisCleaner.flushCurrentDb();
  }

  // === 디버깅 및 정보 메서드들 ===

  /**
   * 데이터베이스 상태 확인
   */
  async getDatabaseStatus() {
    return await this.databaseCleaner.getTableCounts();
  }

  /**
   * Redis 상태 확인
   */
  async getRedisStatus() {
    return await this.redisCleaner.getInfo();
  }

  /**
   * 전체 상태 확인
   */
  async getStatus() {
    const [database, redis] = await Promise.all([
      this.getDatabaseStatus(),
      this.getRedisStatus(),
    ]);

    return {
      database,
      redis,
    };
  }
}

/**
 * 간편한 테스트 데이터 관리 함수들
 */
export const createTestDataManager = (
  dataSource: DataSource,
  redisService: RedisService,
): TestDataManager => {
  return new TestDataManager(dataSource, redisService);
};

/**
 * 전체 테스트 환경 정리 (가장 자주 사용)
 */
export const cleanTestEnvironment = async (
  dataSource: DataSource,
  redisService: RedisService,
): Promise<void> => {
  await Promise.all([cleanDatabase(dataSource), cleanRedisCache(redisService)]);
};

// Factory들은 필요할 때 개별 import해서 사용
