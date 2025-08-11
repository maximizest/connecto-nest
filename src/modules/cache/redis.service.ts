import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { CHAT_CONSTANTS } from '../../common/constants/app.constants';
import { REDIS_CONFIG } from '../../config/redis.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private isConnected = false;

  async onModuleInit() {
    try {
      // Redis 인스턴스 생성
      if (REDIS_CONFIG.url) {
        this.redis = new Redis(REDIS_CONFIG.url, {
          ...REDIS_CONFIG,
        });
      } else {
        this.redis = new Redis(REDIS_CONFIG);
      }

      // 연결 이벤트 리스너 설정
      this.redis.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Redis connected successfully');
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
        this.logger.log('🟢 Redis is ready');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.logger.error('❌ Redis connection error:', error.message);
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
        this.logger.log('🏓 Redis ping successful');
      } catch (pingError) {
        this.logger.warn(
          '⚠️ Redis ping failed, but service will continue without caching:',
          pingError.message,
        );
      }
    } catch (error) {
      this.logger.error(
        '❌ Redis initialization failed, continuing without caching:',
        error.message,
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
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error.message);
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
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error.message);
      return 'OK';
    }
  }

  async del(key: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error.message);
      return 0;
    }
  }

  async exists(key: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      return await this.redis.exists(key);
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return 0;
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
    } catch (error) {
      this.logger.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<'OK'> {
    const serialized = JSON.stringify(value);
    return await this.set(key, serialized, ttl);
  }

  /**
   * Travel 관련 캐시 작업
   */
  async getTravelInfo(travelId: string) {
    return await this.getJson(`travel:${travelId}`);
  }

  async setTravelInfo(
    travelId: string,
    travelInfo: any,
    ttl: number = CHAT_CONSTANTS.CACHE_TTL,
  ) {
    return await this.setJson(`travel:${travelId}`, travelInfo, ttl);
  }

  async deleteTravelInfo(travelId: string) {
    return await this.del(`travel:${travelId}`);
  }

  /**
   * Planet 관련 캐시 작업
   */
  async getPlanetInfo(planetId: string) {
    return await this.getJson(`planet:${planetId}`);
  }

  async setPlanetInfo(
    planetId: string,
    planetInfo: any,
    ttl: number = CHAT_CONSTANTS.CACHE_TTL,
  ) {
    return await this.setJson(`planet:${planetId}`, planetInfo, ttl);
  }

  async deletePlanetInfo(planetId: string) {
    return await this.del(`planet:${planetId}`);
  }

  /**
   * 최근 메시지 캐시 (Planet별)
   */
  async getRecentMessages(planetId: string) {
    return await this.getJson(`planet:${planetId}:messages:recent`);
  }

  async setRecentMessages(
    planetId: string,
    messages: any[],
    ttl: number = CHAT_CONSTANTS.CACHE_TTL,
  ) {
    return await this.setJson(
      `planet:${planetId}:messages:recent`,
      messages,
      ttl,
    );
  }

  /**
   * 온라인 사용자 관리 (SET 자료구조 사용)
   */
  async addOnlineUser(userId: string, planetId?: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      const key = planetId ? `planet:${planetId}:online` : 'users:online';
      return await this.redis.sadd(key, userId);
    } catch (error) {
      this.logger.error(`Redis addOnlineUser error:`, error.message);
      return 0;
    }
  }

  async removeOnlineUser(userId: string, planetId?: string): Promise<number> {
    if (!this.checkConnection()) return 0;
    try {
      const key = planetId ? `planet:${planetId}:online` : 'users:online';
      return await this.redis.srem(key, userId);
    } catch (error) {
      this.logger.error(`Redis removeOnlineUser error:`, error.message);
      return 0;
    }
  }

  async getOnlineUsers(planetId?: string): Promise<string[]> {
    if (!this.checkConnection()) return [];
    try {
      const key = planetId ? `planet:${planetId}:online` : 'users:online';
      return await this.redis.smembers(key);
    } catch (error) {
      this.logger.error(`Redis getOnlineUsers error:`, error.message);
      return [];
    }
  }

  async isUserOnline(userId: string, planetId?: string): Promise<boolean> {
    if (!this.checkConnection()) return false;
    try {
      const key = planetId ? `planet:${planetId}:online` : 'users:online';
      const result = await this.redis.sismember(key, userId);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis isUserOnline error:`, error.message);
      return false;
    }
  }

  /**
   * 타이핑 상태 관리 (EXPIRE로 자동 삭제)
   */
  async setUserTyping(userId: string, planetId: string): Promise<'OK'> {
    const key = `planet:${planetId}:typing:${userId}`;
    return await this.redis.setex(
      key,
      CHAT_CONSTANTS.TYPING_TIMEOUT / 1000,
      '1',
    );
  }

  async getUsersTyping(planetId: string): Promise<string[]> {
    const pattern = `planet:${planetId}:typing:*`;
    const keys = await this.redis.keys(pattern);
    return keys.map((key) => key.split(':').pop()!);
  }

  /**
   * 메시지 읽음 상태 관리 (HASH 자료구조)
   */
  async setLastRead(
    userId: string,
    planetId: string,
    messageId: string,
  ): Promise<number> {
    const key = `planet:${planetId}:read`;
    return await this.redis.hset(key, userId, messageId);
  }

  async getLastRead(userId: string, planetId: string): Promise<string | null> {
    const key = `planet:${planetId}:read`;
    return await this.redis.hget(key, userId);
  }

  async getAllLastReads(planetId: string): Promise<Record<string, string>> {
    const key = `planet:${planetId}:read`;
    return await this.redis.hgetall(key);
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
    } catch (error) {
      this.logger.error('Redis health check failed:', error.message);
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
    } catch (error) {
      this.logger.warn(`Failed to get Redis info: ${error.message}`);
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
    } catch (error) {
      this.logger.warn(`Failed to get key count: ${error.message}`);
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
    } catch (error) {
      this.logger.warn(`Failed to get memory usage: ${error.message}`);
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
    } catch (error) {
      this.logger.warn(
        `Failed to get keys with pattern ${pattern}: ${error.message}`,
      );
      return [];
    }
  }
}
