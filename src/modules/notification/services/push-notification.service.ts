import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../cache/redis.service';
import { User } from '../../user/user.entity';
import { Notification } from '../notification.entity';
import { PushPayload } from '../types/push-payload.interface';
import { PushResult } from '../types/push-result.interface';
import { PushToken } from '../types/push-token.interface';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  // Redis 캐시 키
  private readonly PUSH_TOKEN_KEY = 'push:token';
  private readonly PUSH_STATS_KEY = 'push:stats';
  private readonly PUSH_QUEUE_KEY = 'push:queue';

  // 캐시 TTL
  private readonly PUSH_TOKEN_TTL = 86400 * 30; // 30일
  private readonly PUSH_STATS_TTL = 86400; // 1일

  constructor(
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 푸시 토큰 등록
   */
  async registerPushToken(
    userId: number,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceId: string,
    appVersion?: string,
  ): Promise<void> {
    try {
      const pushToken: PushToken = {
        userId,
        token,
        platform,
        deviceId,
        appVersion,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        isActive: true,
      };

      // Redis에 토큰 저장
      const tokenKey = `${this.PUSH_TOKEN_KEY}:${userId}:${deviceId}`;
      await this.redisService.setJson(tokenKey, pushToken, this.PUSH_TOKEN_TTL);

      // 사용자별 토큰 목록 업데이트
      const userTokensKey = `${this.PUSH_TOKEN_KEY}:user:${userId}`;
      const userTokens =
        ((await this.redisService.getJson(userTokensKey)) as string[]) || [];

      if (!userTokens.includes(deviceId)) {
        userTokens.push(deviceId);
        await this.redisService.setJson(
          userTokensKey,
          userTokens,
          this.PUSH_TOKEN_TTL,
        );
      }

      this.logger.log(
        `Push token registered: userId=${userId}, platform=${platform}, deviceId=${deviceId}`,
      );
    } catch (_error) {
      this.logger.error(`Failed to register push token: ${_error.message}`);
      throw _error;
    }
  }

  /**
   * 푸시 토큰 해제
   */
  async unregisterPushToken(userId: number, deviceId: string): Promise<void> {
    try {
      // 개별 토큰 삭제
      const tokenKey = `${this.PUSH_TOKEN_KEY}:${userId}:${deviceId}`;
      await this.redisService.del(tokenKey);

      // 사용자 토큰 목록에서 제거
      const userTokensKey = `${this.PUSH_TOKEN_KEY}:user:${userId}`;
      const userTokens =
        ((await this.redisService.getJson(userTokensKey)) as string[]) || [];
      const updatedTokens = userTokens.filter((token) => token !== deviceId);

      if (updatedTokens.length > 0) {
        await this.redisService.setJson(
          userTokensKey,
          updatedTokens,
          this.PUSH_TOKEN_TTL,
        );
      } else {
        await this.redisService.del(userTokensKey);
      }

      this.logger.log(
        `Push token unregistered: userId=${userId}, deviceId=${deviceId}`,
      );
    } catch (_error) {
      this.logger.error(`Failed to unregister push token: ${_error.message}`);
      throw _error;
    }
  }

  /**
   * 사용자의 활성 푸시 토큰 조회
   */
  async getUserPushTokens(userId: number): Promise<PushToken[]> {
    try {
      const userTokensKey = `${this.PUSH_TOKEN_KEY}:user:${userId}`;
      const deviceIds =
        ((await this.redisService.getJson(userTokensKey)) as string[]) || [];

      const pushTokens: PushToken[] = [];

      for (const deviceId of deviceIds) {
        const tokenKey = `${this.PUSH_TOKEN_KEY}:${userId}:${deviceId}`;
        const pushToken = await this.redisService.getJson<PushToken>(tokenKey);

        if (pushToken && pushToken.isActive) {
          pushTokens.push(pushToken);
        }
      }

      return pushTokens;
    } catch (_error) {
      this.logger.error(`Failed to get user push tokens: ${_error.message}`);
      return [];
    }
  }

  /**
   * 푸시 알림 전송 이벤트 리스너
   */
  @OnEvent('notification.push')
  async handlePushNotification(data: {
    notification: Notification;
    payload: PushPayload;
  }): Promise<void> {
    try {
      const { notification, payload } = data;

      // 사용자의 푸시 토큰 조회
      const pushTokens = await this.getUserPushTokens(notification.userId);

      if (pushTokens.length === 0) {
        this.logger.warn(
          `No push tokens found for user ${notification.userId}`,
        );
        return;
      }

      // 각 디바이스로 푸시 전송
      for (const pushToken of pushTokens) {
        try {
          const result = await this.sendPushToDevice(pushToken, payload);

          // 전송 결과 기록
          await this.recordPushResult(notification.id, pushToken, result);

          // 무효한 토큰 처리
          if (
            !result.success &&
            result.invalidTokens?.includes(pushToken.token)
          ) {
            await this.markTokenAsInactive(pushToken);
          }
        } catch (_error) {
          this.logger.error(
            `Failed to send push to device ${pushToken.deviceId}: ${_error.message}`,
          );
        }
      }

      this.logger.log(
        `Push notification sent to ${pushTokens.length} devices for notification ${notification.id}`,
      );
    } catch (_error) {
      this.logger.error(
        `Failed to handle push notification: ${_error.message}`,
      );
    }
  }

  /**
   * 개별 디바이스로 푸시 전송
   */
  private async sendPushToDevice(
    pushToken: PushToken,
    payload: PushPayload,
  ): Promise<PushResult> {
    try {
      // 플랫폼별 푸시 전송 로직
      switch (pushToken.platform) {
        case 'ios':
          return await this.sendAPNSPush(pushToken, payload);
        case 'android':
          return await this.sendFCMPush(pushToken, payload);
        case 'web':
          return await this.sendWebPush(pushToken, payload);
        default:
          throw new Error(`Unsupported platform: ${pushToken.platform}`);
      }
    } catch (_error) {
      this.logger.error(`Failed to send push to device: ${_error.message}`);
      return {
        success: false,
        error: _error.message,
      };
    }
  }

  /**
   * Apple Push Notification Service (APNs) 전송
   */
  private async sendAPNSPush(
    pushToken: PushToken,
    payload: PushPayload,
  ): Promise<PushResult> {
    // APNs 구현
    // 실제로는 node-apn이나 @parse/node-apn 라이브러리 사용

    this.logger.debug(
      `Sending APNS push to token: ${pushToken.token.substring(0, 8)}...`,
    );

    // 모의 구현 - 실제로는 APNs 서비스 호출
    return {
      success: true,
      messageId: `apns_${Date.now()}`,
    };
  }

  /**
   * Firebase Cloud Messaging (FCM) 전송
   */
  private async sendFCMPush(
    pushToken: PushToken,
    payload: PushPayload,
  ): Promise<PushResult> {
    // FCM 구현
    // 실제로는 firebase-admin SDK 사용

    this.logger.debug(
      `Sending FCM push to token: ${pushToken.token.substring(0, 8)}...`,
    );

    // 모의 구현 - 실제로는 FCM 서비스 호출
    return {
      success: true,
      messageId: `fcm_${Date.now()}`,
    };
  }

  /**
   * Web Push 전송
   */
  private async sendWebPush(
    pushToken: PushToken,
    payload: PushPayload,
  ): Promise<PushResult> {
    // Web Push 구현
    // 실제로는 web-push 라이브러리 사용

    this.logger.debug(
      `Sending Web Push to token: ${pushToken.token.substring(0, 8)}...`,
    );

    // 모의 구현 - 실제로는 Web Push Protocol 사용
    return {
      success: true,
      messageId: `web_${Date.now()}`,
    };
  }

  /**
   * 푸시 전송 결과 기록
   */
  private async recordPushResult(
    notificationId: number,
    pushToken: PushToken,
    result: PushResult,
  ): Promise<void> {
    try {
      const resultKey = `push:result:${notificationId}:${pushToken.deviceId}`;
      const resultData = {
        notificationId,
        userId: pushToken.userId,
        deviceId: pushToken.deviceId,
        platform: pushToken.platform,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        sentAt: new Date(),
      };

      await this.redisService.setJson(resultKey, resultData, 86400); // 1일 보관

      // 통계 업데이트
      await this.updatePushStats(pushToken.platform, result.success);
    } catch (_error) {
      this.logger.error(`Failed to record push result: ${_error.message}`);
    }
  }

  /**
   * 푸시 통계 업데이트
   */
  private async updatePushStats(
    platform: string,
    success: boolean,
  ): Promise<void> {
    try {
      const statsKey = `${this.PUSH_STATS_KEY}:${new Date().toISOString().split('T')[0]}`;
      const stats = (await this.redisService.getJson<any>(statsKey)) || {
        total: 0,
        success: 0,
        failed: 0,
        platforms: {},
      };

      stats.total += 1;
      if (success) {
        stats.success += 1;
      } else {
        stats.failed += 1;
      }

      if (!stats.platforms[platform]) {
        stats.platforms[platform] = { total: 0, success: 0, failed: 0 };
      }

      stats.platforms[platform].total += 1;
      if (success) {
        stats.platforms[platform].success += 1;
      } else {
        stats.platforms[platform].failed += 1;
      }

      await this.redisService.setJson(statsKey, stats, this.PUSH_STATS_TTL);
    } catch (_error) {
      this.logger.error(`Failed to update push stats: ${_error.message}`);
    }
  }

  /**
   * 토큰을 비활성화로 표시
   */
  private async markTokenAsInactive(pushToken: PushToken): Promise<void> {
    try {
      pushToken.isActive = false;

      const tokenKey = `${this.PUSH_TOKEN_KEY}:${pushToken.userId}:${pushToken.deviceId}`;
      await this.redisService.setJson(tokenKey, pushToken, this.PUSH_TOKEN_TTL);

      this.logger.log(
        `Push token marked as inactive: userId=${pushToken.userId}, deviceId=${pushToken.deviceId}`,
      );
    } catch (_error) {
      this.logger.error(`Failed to mark token as inactive: ${_error.message}`);
    }
  }

  /**
   * 푸시 통계 조회
   */
  async getPushStats(date?: string): Promise<any> {
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const statsKey = `${this.PUSH_STATS_KEY}:${dateStr}`;

      return (
        (await this.redisService.getJson(statsKey)) || {
          total: 0,
          success: 0,
          failed: 0,
          platforms: {},
        }
      );
    } catch (_error) {
      this.logger.error(`Failed to get push stats: ${_error.message}`);
      return null;
    }
  }

  /**
   * 배치 푸시 알림 전송
   */
  async sendBatchPushNotifications(
    userIds: number[],
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    try {
      let sent = 0;
      let failed = 0;

      for (const userId of userIds) {
        try {
          const pushTokens = await this.getUserPushTokens(userId);

          for (const pushToken of pushTokens) {
            const result = await this.sendPushToDevice(pushToken, payload);

            if (result.success) {
              sent++;
            } else {
              failed++;
            }

            // 무효한 토큰 처리
            if (
              !result.success &&
              result.invalidTokens?.includes(pushToken.token)
            ) {
              await this.markTokenAsInactive(pushToken);
            }
          }
        } catch (_error) {
          this.logger.error(
            `Failed to send batch push to user ${userId}: ${_error.message}`,
          );
          failed++;
        }
      }

      this.logger.log(`Batch push completed: sent=${sent}, failed=${failed}`);

      return { sent, failed };
    } catch (_error) {
      this.logger.error(
        `Failed to send batch push notifications: ${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * 비활성 토큰 정리
   */
  async cleanupInactiveTokens(): Promise<number> {
    try {
      // 실제 구현에서는 더 정교한 로직 필요
      // 현재는 기본적인 예시만 제공

      this.logger.log('Cleaned up inactive push tokens');
      return 0;
    } catch (_error) {
      this.logger.error(`Failed to cleanup inactive tokens: ${_error.message}`);
      return 0;
    }
  }
}
