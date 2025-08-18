import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

/**
 * Token Blacklist Service
 *
 * JWT 토큰 블랙리스트 관리 서비스
 * Redis를 사용하여 무효화된 토큰을 추적합니다.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 특정 토큰을 블랙리스트에 추가
   */
  async blacklistToken(
    token: string,
    userId: number,
    reason: string,
  ): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || !decoded.exp) {
        this.logger.warn(
          `Invalid token format for blacklisting: userId=${userId}`,
        );
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiry = decoded.exp - now;

      if (expiry > 0) {
        const key = `blacklist:token:${token}`;
        const value = JSON.stringify({
          userId,
          reason,
          blacklistedAt: new Date().toISOString(),
        });

        await this.redis.setex(key, expiry, value);
        this.logger.log(
          `Token blacklisted: userId=${userId}, reason=${reason}, expiry=${expiry}s`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to blacklist token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 토큰이 블랙리스트에 있는지 확인
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `blacklist:token:${token}`;
      const result = await this.redis.get(key);
      return !!result;
    } catch (error) {
      this.logger.error(
        `Failed to check token blacklist: ${error.message}`,
        error.stack,
      );
      return false; // 에러 시 안전하게 false 반환
    }
  }

  /**
   * 특정 사용자의 모든 세션을 블랙리스트에 추가
   */
  async blacklistUserSessions(userId: number, reason: string): Promise<void> {
    try {
      const key = `blacklist:user:${userId}`;
      const value = JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString(),
      });

      // 7일간 유지 (refresh token의 최대 유효기간)
      await this.redis.setex(key, 86400 * 7, value);

      // 사용자의 모든 활성 토큰 무효화 플래그 설정
      await this.redis.setex(
        `blacklist:user:${userId}:all`,
        86400 * 7,
        new Date().toISOString(),
      );

      this.logger.log(
        `All sessions blacklisted for user: userId=${userId}, reason=${reason}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to blacklist user sessions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자의 모든 세션이 블랙리스트에 있는지 확인
   */
  async isUserBlacklisted(userId: number): Promise<boolean> {
    try {
      const key = `blacklist:user:${userId}:all`;
      const result = await this.redis.get(key);
      return !!result;
    } catch (error) {
      this.logger.error(
        `Failed to check user blacklist: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 블랙리스트 정보 조회
   */
  async getBlacklistInfo(token: string): Promise<any | null> {
    try {
      const key = `blacklist:token:${token}`;
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get blacklist info: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 사용자 블랙리스트 정보 조회
   */
  async getUserBlacklistInfo(userId: number): Promise<any | null> {
    try {
      const key = `blacklist:user:${userId}`;
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get user blacklist info: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * 블랙리스트 해제 (관리자용)
   */
  async removeFromBlacklist(userId: number): Promise<void> {
    try {
      await this.redis.del(
        `blacklist:user:${userId}`,
        `blacklist:user:${userId}:all`,
      );
      this.logger.log(`User removed from blacklist: userId=${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove from blacklist: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
