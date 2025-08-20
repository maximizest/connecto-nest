import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CONFIG, TEST_REDIS_CONFIG } from '../../config/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private isConnected = false;

  async onModuleInit() {
    try {
      // 환경에 따른 Redis 설정 선택
      const redisConfig =
        process.env.NODE_ENV === 'test' ? TEST_REDIS_CONFIG : REDIS_CONFIG;

      // Redis 인스턴스 생성
      if (redisConfig.url) {
        this.redis = new Redis(redisConfig.url, {
          ...redisConfig,
        });
      } else {
        this.redis = new Redis(redisConfig);
      }

      // 연결 이벤트 리스너 설정
      this.redis.on('connect', () => {
        this.isConnected = true;
        const environment =
          process.env.NODE_ENV === 'test' ? 'Test' : 'Production';
        this.logger.log(`✅ ${environment} Redis connected successfully`);
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
        const environment =
          process.env.NODE_ENV === 'test' ? 'Test' : 'Production';
        this.logger.log(`🟢 ${environment} Redis is ready`);
      });

      this.redis.on('error', (_error) => {
        this.isConnected = false;
        this.logger.error('❌ Redis connection error:', _error.message);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.logger.warn('🔴 Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.logger.warn('🔄 Redis reconnecting...');
      });

      // 연결 테스트 (실패해도 앱이 종료되지 않음)
      try {
        await this.redis.ping();
        const environment =
          process.env.NODE_ENV === 'test' ? 'Test' : 'Production';
        this.logger.log(`🏓 ${environment} Redis ping successful`);
      } catch (pingError) {
        const environment =
          process.env.NODE_ENV === 'test' ? 'Test' : 'Production';
        this.logger.warn(
          `⚠️ ${environment} Redis ping failed, but service will continue without caching:`,
          pingError.message,
        );
      }
    } catch (_error) {
      this.logger.error(
        '❌ Redis initialization failed, continuing without caching:',
        _error.message,
      );
      // Redis 없이도 서비스가 계속 실행되도록 에러를 throw하지 않음
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('🔌 Redis connection closed');
    }
  }

  /**
   * Redis 클라이언트 인스턴스 반환
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 연결 상태 확인
   */
  private checkConnection(): boolean {
    if (!this.isConnected || !this.redis) {
      this.logger.warn('⚠️ Redis not connected, operation skipped');
      return false;
    }
    return true;
  }

  /**
   * 기본 캐시 작업
   */
  async get(key: string): Promise<string | null> {
    if (!this.checkConnection()) return null;
    try {
      return await this.redis.get(key);
    } catch (_error) {
      this.logger.error(`Redis GET error for key ${key}:`, _error.message);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (!this.checkConnection()) return 'OK'; // Silent fail
    try {
      if (ttl) {
        return await this.redis.setex(key, ttl, value);
      }
      return await this.redis.set(key, value);
    } catch (_error) {
      this.logger.error(`Redis SET error for key ${key}:`, _error.message);
      return 'OK';
    }
  }

  async del(key: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.del(key);
    } catch (_error) {
      this.logger.error(`Redis DEL error for key ${key}:`, _error.message);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.exists(key);
    } catch (_error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, _error.message);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.incr(key);
    } catch (_error) {
      this.logger.error(`Redis INCR error for key ${key}:`, _error.message);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.expire(key, seconds);
    } catch (_error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, _error.message);
      return 0;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.checkConnection()) return -1;
    try {
      return await this.redis.ttl(key);
    } catch (_error) {
      this.logger.error(`Redis TTL error for key ${key}:`, _error.message);
      return -1;
    }
  }

  /**
   * JSON 객체 캐시 (직렬화/역직렬화)
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (_error) {
      this.logger.error(`Failed to parse JSON for key ${key}:`, _error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<'OK'> {
    const serialized = JSON.stringify(value);
    return await this.set(key, serialized, ttl);
  }

  /**
   * 속도 제한 (Rate Limiting)
   */
  async incrementRateLimit(
    userId: string,
    action: string,
    window: number = 60,
  ): Promise<number> {
    const key = `ratelimit:${action}:${userId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return current;
  }

  /**
   * 세션 관리
   */
  async setUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 86400,
  ): Promise<'OK'> {
    const key = `session:${userId}`;
    return await this.setJson(key, sessionData, ttl);
  }

  async getUserSession(userId: string) {
    const key = `session:${userId}`;
    return await this.getJson(key);
  }

  async deleteUserSession(userId: string): Promise<number> {
    const key = `session:${userId}`;
    return await this.del(key);
  }

  /**
   * 캐시 무효화 (패턴 기반)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;

    return await this.redis.del(...keys);
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    if (!this.checkConnection()) return false;
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (_error) {
      this.logger.error('Redis health check failed:', _error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Redis INFO 명령어 실행
   */
  async getInfo(section?: string): Promise<any> {
    if (!this.checkConnection()) {
      return {};
    }

    try {
      const info = section
        ? await this.redis.info(section)
        : await this.redis.info();
      const parsed: any = {};

      info.split('\r\n').forEach((line) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            parsed[key] = value;
          }
        }
      });

      return parsed;
    } catch (_error) {
      this.logger.warn(`Failed to get Redis info: ${_error.message}`);
      return {};
    }
  }

  /**
   * Redis 키 개수 조회
   */
  async getKeyCount(pattern: string = '*'): Promise<number> {
    if (!this.checkConnection()) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (_error) {
      this.logger.warn(`Failed to get key count: ${_error.message}`);
      return 0;
    }
  }

  /**
   * Redis 메모리 사용량 조회
   */
  async getMemoryUsage(): Promise<string> {
    if (!this.checkConnection()) {
      return 'N/A';
    }

    try {
      const info = await this.getInfo('memory');
      return info.used_memory_human || 'N/A';
    } catch (_error) {
      this.logger.warn(`Failed to get memory usage: ${_error.message}`);
      return 'N/A';
    }
  }

  /**
   * 패턴에 맞는 키 목록 조회
   */
  async getKeys(pattern: string): Promise<string[]> {
    if (!this.checkConnection()) {
      return [];
    }

    try {
      return await this.redis.keys(pattern);
    } catch (_error) {
      this.logger.warn(
        `Failed to get keys with pattern ${pattern}: ${_error.message}`,
      );
      return [];
    }
  }
}
