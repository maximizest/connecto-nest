import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../cache/redis.service';
import {
  DEFAULT_RATE_LIMITS,
  MESSAGE_TYPE_MULTIPLIERS,
  RATE_LIMIT_BLOCKED_PREFIX,
  RATE_LIMIT_KEY_PREFIX,
  RATE_LIMIT_STATS_PREFIX,
  RATE_LIMIT_WARNING_THRESHOLD,
} from '../constants/rate-limit.constants';
import {
  DynamicRateLimitConfig,
  RateLimitAction,
  RateLimitConfig,
  RateLimitExceeded,
  RateLimitKeyInfo,
  RateLimitResult,
  RateLimitScope,
  RateLimitStats,
} from '../types/rate-limit.types';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Rate limit 체크 및 적용
   */
  async checkRateLimit(
    userId: number,
    scope: RateLimitScope,
    action: RateLimitAction,
    entityId?: number,
    messageType?: string,
  ): Promise<RateLimitResult> {
    try {
      // 설정 가져오기
      const config = await this.getRateLimitConfig(
        scope,
        action,
        entityId,
        messageType,
      );

      if (!config) {
        // 설정이 없으면 허용
        return {
          allowed: true,
          limit: Infinity,
          remaining: Infinity,
          resetTime: Date.now() + 60000,
        };
      }

      // 키 정보 생성
      const keyInfo = this.buildKeyInfo(userId, scope, action, entityId);

      // 차단 상태 확인
      const isBlocked = await this.isUserBlocked(keyInfo, config);
      if (isBlocked) {
        return this.createBlockedResult(keyInfo, config);
      }

      // 현재 사용량 확인
      const currentUsage = await this.getCurrentUsage(keyInfo, config);
      const multiplier = this.getMultiplier(messageType, userId);
      const effectiveLimit = Math.floor(config.limit * multiplier);

      // 제한 확인
      if (currentUsage >= effectiveLimit) {
        // 제한 초과 - 차단 처리
        if (config.blockDuration) {
          await this.blockUser(keyInfo, config);
        }

        const resetTime = await this.getResetTime(keyInfo, config);
        return {
          allowed: false,
          limit: effectiveLimit,
          remaining: 0,
          resetTime,
          retryAfter: config.blockDuration || config.window,
          message: config.message,
        };
      }

      // 사용량 증가
      await this.incrementUsage(keyInfo, config);

      // 통계 업데이트
      await this.updateStats(keyInfo, true);

      const remaining = effectiveLimit - currentUsage - 1;
      const resetTime = await this.getResetTime(keyInfo, config);

      // 경고 임계값 확인
      const warningThreshold = effectiveLimit * RATE_LIMIT_WARNING_THRESHOLD;
      if (currentUsage >= warningThreshold) {
        this.logger.warn(
          `User ${userId} approaching rate limit: ${currentUsage}/${effectiveLimit} for ${scope}:${action}`,
        );
      }

      return {
        allowed: true,
        limit: effectiveLimit,
        remaining,
        resetTime,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for user ${userId}: ${error.message}`,
      );
      // 에러 발생 시 허용 (안전한 실패)
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * Rate limit 설정 가져오기 (동적 설정 포함)
   */
  private async getRateLimitConfig(
    scope: RateLimitScope,
    action: RateLimitAction,
    entityId?: number,
    messageType?: string,
  ): Promise<RateLimitConfig | null> {
    // 기본 설정 찾기
    const configKey = `${scope.toUpperCase()}_${action.toUpperCase()}`;
    let config = DEFAULT_RATE_LIMITS[configKey];

    if (!config) {
      return null;
    }

    // Planet 동적 설정 적용
    if (scope === RateLimitScope.PLANET && entityId) {
      const dynamicConfig = await this.getPlanetRateLimitConfig(entityId);
      if (dynamicConfig && dynamicConfig.enabled) {
        config = this.applyDynamicConfig(config, dynamicConfig, action);
      }
    }

    return config;
  }

  /**
   * Planet별 동적 Rate Limit 설정 조회
   */
  private async getPlanetRateLimitConfig(
    planetId: number,
  ): Promise<DynamicRateLimitConfig | null> {
    try {
      const key = `planet:rate_limit:${planetId}`;
      const config = await this.redisService.getJson(key);
      return config as DynamicRateLimitConfig;
    } catch (error) {
      this.logger.warn(
        `Failed to get planet rate limit config ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 동적 설정 적용
   */
  private applyDynamicConfig(
    baseConfig: RateLimitConfig,
    dynamicConfig: DynamicRateLimitConfig,
    action: RateLimitAction,
  ): RateLimitConfig {
    const config = { ...baseConfig };

    // 액션별 특별 제한 적용
    if (dynamicConfig.specialLimits?.[action]) {
      const specialLimit = dynamicConfig.specialLimits[action];
      config.limit = specialLimit.limit;
      config.window = specialLimit.window;
    } else {
      // 일반 제한 적용
      switch (action) {
        case RateLimitAction.MESSAGE_SEND:
          if (dynamicConfig.messagesPerMinute) {
            config.limit = dynamicConfig.messagesPerMinute;
            config.window = 60;
          }
          break;
        case RateLimitAction.FILE_UPLOAD:
          if (dynamicConfig.filesPerHour) {
            config.limit = dynamicConfig.filesPerHour;
            config.window = 3600;
          }
          break;
      }
    }

    return config;
  }

  /**
   * 키 정보 생성
   */
  private buildKeyInfo(
    userId: number,
    scope: RateLimitScope,
    action: RateLimitAction,
    entityId?: number,
  ): RateLimitKeyInfo {
    let key = `${RATE_LIMIT_KEY_PREFIX}:${scope}:${action}:user:${userId}`;

    if (entityId) {
      key = `${RATE_LIMIT_KEY_PREFIX}:${scope}:${entityId}:${action}:user:${userId}`;
    }

    return {
      key,
      userId,
      scope,
      action,
      entityId,
    };
  }

  /**
   * 사용자 차단 상태 확인
   */
  private async isUserBlocked(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<boolean> {
    if (!config.blockDuration) return false;

    try {
      const blockKey = `${RATE_LIMIT_BLOCKED_PREFIX}:${keyInfo.key}`;
      const blocked = await this.redisService.exists(blockKey);
      return blocked > 0; // Redis exists returns number, convert to boolean
    } catch (error) {
      this.logger.warn(`Failed to check block status: ${error.message}`);
      return false;
    }
  }

  /**
   * 현재 사용량 조회
   */
  private async getCurrentUsage(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<number> {
    try {
      const usage = await this.redisService.get(keyInfo.key);
      return usage ? parseInt(usage, 10) : 0;
    } catch (error) {
      this.logger.warn(`Failed to get current usage: ${error.message}`);
      return 0;
    }
  }

  /**
   * 사용량 증가
   */
  private async incrementUsage(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<void> {
    try {
      const pipeline = this.redisService['redis'].pipeline();
      pipeline.incr(keyInfo.key);
      pipeline.expire(keyInfo.key, config.window);
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * 사용자 차단
   */
  private async blockUser(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<void> {
    if (!config.blockDuration) return;

    try {
      const blockKey = `${RATE_LIMIT_BLOCKED_PREFIX}:${keyInfo.key}`;
      await this.redisService.set(
        blockKey,
        Date.now().toString(),
        config.blockDuration,
      );

      // 통계 업데이트
      await this.updateStats(keyInfo, false);

      this.logger.warn(
        `User ${keyInfo.userId} blocked for ${config.blockDuration}s due to rate limit: ${keyInfo.scope}:${keyInfo.action}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to block user: ${error.message}`);
    }
  }

  /**
   * 리셋 시간 조회
   */
  private async getResetTime(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<number> {
    try {
      const ttl = await this.redisService['redis'].ttl(keyInfo.key);
      return Date.now() + (ttl > 0 ? ttl * 1000 : config.window * 1000);
    } catch (error) {
      return Date.now() + config.window * 1000;
    }
  }

  /**
   * 차단된 결과 생성
   */
  private async createBlockedResult(
    keyInfo: RateLimitKeyInfo,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const blockKey = `${RATE_LIMIT_BLOCKED_PREFIX}:${keyInfo.key}`;
    const ttl = await this.redisService['redis'].ttl(blockKey);

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetTime: Date.now() + (ttl > 0 ? ttl * 1000 : 0),
      retryAfter: ttl > 0 ? ttl : config.blockDuration,
      message: config.message || 'Rate limit exceeded and temporarily blocked',
    };
  }

  /**
   * Rate Limit 승수 계산 (메시지 타입, 사용자 상태 등)
   */
  private getMultiplier(messageType?: string, userId?: number): number {
    let multiplier = 1.0;

    // 메시지 타입별 승수
    if (messageType && MESSAGE_TYPE_MULTIPLIERS[messageType.toUpperCase()]) {
      multiplier *= MESSAGE_TYPE_MULTIPLIERS[messageType.toUpperCase()];
    }

    // 추후 사용자 상태별 승수 추가 가능
    // if (isVip) multiplier *= VIP_RATE_LIMIT_MULTIPLIER;
    // if (isNewUser) multiplier *= NEW_USER_RATE_LIMIT_MULTIPLIER;

    return multiplier;
  }

  /**
   * Rate Limit 통계 업데이트
   */
  private async updateStats(
    keyInfo: RateLimitKeyInfo,
    allowed: boolean,
  ): Promise<void> {
    try {
      const statsKey = `${RATE_LIMIT_STATS_PREFIX}:${keyInfo.key}:daily:${new Date().toISOString().split('T')[0]}`;

      const pipeline = this.redisService['redis'].pipeline();
      pipeline.hincrby(statsKey, 'total_requests', 1);

      if (!allowed) {
        pipeline.hincrby(statsKey, 'blocked_requests', 1);
        pipeline.hset(statsKey, 'last_blocked_at', new Date().toISOString());
      }

      pipeline.hset(statsKey, 'last_request_at', new Date().toISOString());
      pipeline.expire(statsKey, 86400 * 7); // 7일 보관

      await pipeline.exec();
    } catch (error) {
      // 통계 업데이트 실패는 로깅만 하고 넘어감
      this.logger.debug(`Failed to update stats: ${error.message}`);
    }
  }

  /**
   * Rate Limit 통계 조회
   */
  async getRateLimitStats(
    userId: number,
    scope: RateLimitScope,
    action: RateLimitAction,
    entityId?: number,
    date?: string,
  ): Promise<RateLimitStats | null> {
    try {
      const keyInfo = this.buildKeyInfo(userId, scope, action, entityId);
      const targetDate = date || new Date().toISOString().split('T')[0];
      const statsKey = `${RATE_LIMIT_STATS_PREFIX}:${keyInfo.key}:daily:${targetDate}`;

      const stats = await this.redisService['redis'].hgetall(statsKey);

      if (!stats || Object.keys(stats).length === 0) {
        return null;
      }

      // 현재 윈도우 정보
      const currentUsage = await this.getCurrentUsage(
        keyInfo,
        (await this.getRateLimitConfig(scope, action, entityId)) ||
          ({ window: 60 } as RateLimitConfig),
      );
      const resetTime = await this.getResetTime(
        keyInfo,
        (await this.getRateLimitConfig(scope, action, entityId)) ||
          ({ window: 60 } as RateLimitConfig),
      );

      return {
        userId,
        scope,
        action,
        entityId,
        totalRequests: parseInt(stats.total_requests || '0', 10),
        blockedRequests: parseInt(stats.blocked_requests || '0', 10),
        lastRequestAt: stats.last_request_at || new Date().toISOString(),
        lastBlockedAt: stats.last_blocked_at,
        currentWindow: {
          requests: currentUsage,
          windowStart: new Date(resetTime - 60000).toISOString(),
          windowEnd: new Date(resetTime).toISOString(),
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to get rate limit stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Rate Limit 리셋 (관리용)
   */
  async resetRateLimit(
    userId: number,
    scope: RateLimitScope,
    action: RateLimitAction,
    entityId?: number,
  ): Promise<boolean> {
    try {
      const keyInfo = this.buildKeyInfo(userId, scope, action, entityId);
      const blockKey = `${RATE_LIMIT_BLOCKED_PREFIX}:${keyInfo.key}`;

      const pipeline = this.redisService['redis'].pipeline();
      pipeline.del(keyInfo.key);
      pipeline.del(blockKey);
      await pipeline.exec();

      this.logger.log(
        `Rate limit reset for user ${userId}: ${scope}:${action}${entityId ? `:${entityId}` : ''}`,
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to reset rate limit: ${error.message}`);
      return false;
    }
  }

  /**
   * Planet Rate Limit 설정 업데이트
   */
  async updatePlanetRateLimitConfig(
    planetId: number,
    config: DynamicRateLimitConfig,
  ): Promise<void> {
    try {
      const key = `planet:rate_limit:${planetId}`;
      await this.redisService.setJson(key, config, 86400); // 24시간

      this.logger.log(`Planet ${planetId} rate limit config updated`);
    } catch (error) {
      this.logger.error(
        `Failed to update planet rate limit config: ${error.message}`,
      );
    }
  }

  /**
   * Rate Limit 예외 생성 및 발생
   */
  throwRateLimitException(
    result: RateLimitResult,
    keyInfo: RateLimitKeyInfo,
  ): never {
    throw new RateLimitExceeded(result, keyInfo);
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded';
    redis: boolean;
    activeBlocks: number;
  }> {
    try {
      const redisHealthy = await this.redisService.healthCheck();

      // 현재 활성 차단 수 확인
      const blockKeys = await this.redisService['redis'].keys(
        `${RATE_LIMIT_BLOCKED_PREFIX}:*`,
      );

      return {
        status: redisHealthy ? 'healthy' : 'degraded',
        redis: redisHealthy,
        activeBlocks: blockKeys.length,
      };
    } catch (error) {
      this.logger.error(`Rate limit health check failed: ${error.message}`);
      return {
        status: 'degraded',
        redis: false,
        activeBlocks: 0,
      };
    }
  }
}
