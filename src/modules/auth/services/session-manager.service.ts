import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session Manager Service
 *
 * 사용자 세션 관리 서비스
 * Redis를 사용하여 활성 세션을 추적하고 관리합니다.
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 새로운 세션 생성
   */
  async createSession(
    userId: number,
    token: string,
    deviceId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      platform?: string;
    },
  ): Promise<string> {
    try {
      const sessionId = uuidv4();
      const sessionData = {
        sessionId,
        userId,
        token,
        deviceId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        platform: metadata?.platform,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      // 세션 데이터 저장 (24시간)
      await this.redis.setex(
        `session:${sessionId}`,
        86400,
        JSON.stringify(sessionData),
      );

      // 사용자별 세션 목록에 추가
      await this.redis.sadd(`user:${userId}:sessions`, sessionId);

      // 디바이스별 세션 매핑
      if (deviceId) {
        await this.redis.set(
          `device:${deviceId}:session`,
          sessionId,
          'EX',
          86400,
        );
      }

      this.logger.log(
        `Session created: sessionId=${sessionId}, userId=${userId}, deviceId=${deviceId}`,
      );

      return sessionId;
    } catch (error) {
      this.logger.error(
        `Failed to create session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 세션 활동 시간 업데이트
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.lastActivity = new Date().toISOString();

        await this.redis.setex(sessionKey, 86400, JSON.stringify(session));
      }
    } catch (error) {
      this.logger.error(
        `Failed to update session activity: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 특정 세션 무효화
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);

      if (sessionData) {
        const session = JSON.parse(sessionData);

        // 세션 삭제
        await this.redis.del(`session:${sessionId}`);

        // 사용자 세션 목록에서 제거
        await this.redis.srem(`user:${session.userId}:sessions`, sessionId);

        // 디바이스 세션 매핑 제거
        if (session.deviceId) {
          await this.redis.del(`device:${session.deviceId}:session`);
        }

        this.logger.log(
          `Session invalidated: sessionId=${sessionId}, userId=${session.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate session: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자의 모든 세션 무효화
   */
  async invalidateUserSessions(
    userId: number,
    reason?: string,
  ): Promise<number> {
    try {
      const sessions = await this.redis.smembers(`user:${userId}:sessions`);
      let invalidatedCount = 0;

      for (const sessionId of sessions) {
        const sessionData = await this.redis.get(`session:${sessionId}`);

        if (sessionData) {
          const session = JSON.parse(sessionData);

          // 세션 삭제
          await this.redis.del(`session:${sessionId}`);

          // 디바이스 세션 매핑 제거
          if (session.deviceId) {
            await this.redis.del(`device:${session.deviceId}:session`);
          }

          invalidatedCount++;
        }
      }

      // 사용자 세션 목록 삭제
      await this.redis.del(`user:${userId}:sessions`);

      // 이벤트 발생 (WebSocket 연결 종료용)
      this.eventEmitter.emit('user.sessions.invalidated', {
        userId,
        reason: reason || 'manual_invalidation',
        invalidatedCount,
        timestamp: new Date(),
      });

      this.logger.log(
        `All sessions invalidated: userId=${userId}, count=${invalidatedCount}, reason=${reason}`,
      );

      return invalidatedCount;
    } catch (error) {
      this.logger.error(
        `Failed to invalidate user sessions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자의 활성 세션 목록 조회
   */
  async getUserSessions(userId: number): Promise<any[]> {
    try {
      const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
      const sessions: any[] = [];

      for (const sessionId of sessionIds) {
        const sessionData = await this.redis.get(`session:${sessionId}`);
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error(
        `Failed to get user sessions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 세션 정보 조회
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      this.logger.error(`Failed to get session: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 디바이스별 세션 조회
   */
  async getDeviceSession(deviceId: string): Promise<any | null> {
    try {
      const sessionId = await this.redis.get(`device:${deviceId}:session`);
      if (!sessionId) return null;

      return this.getSession(sessionId);
    } catch (error) {
      this.logger.error(
        `Failed to get device session: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 만료된 세션 정리 (스케줄러용)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const pattern = 'session:*';
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) {
          // 키가 존재하지 않음
          const sessionId = key.replace('session:', '');
          await this.invalidateSession(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired sessions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 활성 세션 통계 조회
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    uniqueUsers: number;
    deviceTypes: Record<string, number>;
  }> {
    try {
      const pattern = 'session:*';
      const keys = await this.redis.keys(pattern);

      const users = new Set<number>();
      const deviceTypes: Record<string, number> = {};

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          users.add(session.userId);

          const platform = session.platform || 'unknown';
          deviceTypes[platform] = (deviceTypes[platform] || 0) + 1;
        }
      }

      return {
        totalSessions: keys.length,
        uniqueUsers: users.size,
        deviceTypes,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get session stats: ${error.message}`,
        error.stack,
      );
      return {
        totalSessions: 0,
        uniqueUsers: 0,
        deviceTypes: {},
      };
    }
  }
}
