import { Injectable, Logger } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { PushToken, PushTokenPlatform } from './push-token.entity';

/**
 * Push Token Service
 * 
 * 푸시 토큰 관리를 위한 서비스
 * Active Record 패턴 활용
 */
@Injectable()
export class PushTokenService extends CrudService<PushToken> {
  private readonly logger = new Logger(PushTokenService.name);

  constructor() {
    super(PushToken.getRepository());
  }

  /**
   * 푸시 토큰 등록/업데이트
   */
  async registerToken(data: {
    userId: number;
    token: string;
    platform: PushTokenPlatform;
    deviceId: string;
    appVersion?: string;
    deviceModel?: string;
    osVersion?: string;
  }): Promise<PushToken> {
    try {
      const pushToken = await PushToken.upsertToken(data);
      
      this.logger.log(
        `Push token registered: userId=${data.userId}, deviceId=${data.deviceId}, platform=${data.platform}`,
      );
      
      return pushToken;
    } catch (error) {
      this.logger.error(
        `Failed to register push token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 푸시 토큰 해제
   */
  async unregisterToken(userId: number, deviceId: string): Promise<boolean> {
    try {
      const result = await PushToken.deactivateToken(userId, deviceId);
      
      if (result) {
        this.logger.log(
          `Push token unregistered: userId=${userId}, deviceId=${deviceId}`,
        );
      } else {
        this.logger.warn(
          `Push token not found: userId=${userId}, deviceId=${deviceId}`,
        );
      }
      
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to unregister push token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자의 활성 푸시 토큰 목록 조회
   */
  async getUserTokens(userId: number): Promise<PushToken[]> {
    try {
      const tokens = await PushToken.findByUserId(userId);
      
      this.logger.debug(
        `Retrieved ${tokens.length} active tokens for user ${userId}`,
      );
      
      return tokens;
    } catch (error) {
      this.logger.error(
        `Failed to get user tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 특정 디바이스의 푸시 토큰 조회
   */
  async getDeviceToken(
    userId: number,
    deviceId: string,
  ): Promise<PushToken | null> {
    try {
      return await PushToken.findByDeviceId(userId, deviceId);
    } catch (error) {
      this.logger.error(
        `Failed to get device token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 푸시 전송 성공 기록
   */
  async recordSuccess(tokenId: number): Promise<void> {
    try {
      await PushToken.recordUsage(tokenId);
      
      this.logger.debug(`Push success recorded for token ${tokenId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record push success: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 푸시 전송 실패 기록
   */
  async recordFailure(tokenId: number): Promise<void> {
    try {
      await PushToken.incrementFailure(tokenId);
      
      this.logger.warn(`Push failure recorded for token ${tokenId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record push failure: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 비활성 토큰 정리 (스케줄러용)
   */
  async cleanupInactiveTokens(): Promise<number> {
    try {
      // 30일 이상 사용되지 않은 토큰 삭제
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await PushToken.createQueryBuilder()
        .delete()
        .where('lastUsedAt < :date OR (isActive = false AND updatedAt < :date)', {
          date: thirtyDaysAgo,
        })
        .execute();
      
      const deletedCount = result.affected || 0;
      
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} inactive push tokens`);
      }
      
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup inactive tokens: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * 플랫폼별 토큰 통계
   */
  async getTokenStatistics(): Promise<{
    total: number;
    active: number;
    byPlatform: Record<PushTokenPlatform, number>;
  }> {
    try {
      const stats = await PushToken.createQueryBuilder('token')
        .select('token.platform', 'platform')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(CASE WHEN token.isActive = true THEN 1 ELSE 0 END)', 'active')
        .groupBy('token.platform')
        .getRawMany();
      
      const result = {
        total: 0,
        active: 0,
        byPlatform: {} as Record<PushTokenPlatform, number>,
      };
      
      stats.forEach(stat => {
        const count = parseInt(stat.count);
        const active = parseInt(stat.active);
        
        result.total += count;
        result.active += active;
        result.byPlatform[stat.platform as PushTokenPlatform] = count;
      });
      
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get token statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}