import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LessThan, Between } from 'typeorm';
import { Travel } from '../../travel/travel.entity';
import { TravelUser } from '../../travel-user/travel-user.entity';
import { TravelStatus } from '../../travel/enums/travel-status.enum';
import { TravelService } from '../../travel/travel.service';
import { RedisService } from '../../cache/redis.service';

interface TravelCleanupResult {
  processedItems: number;
  expiredTravels: number;
  expiringTravels: number;
  notificationsSet: number;
  errors: string[];
}

@Injectable()
@Processor('expired-travel', {
  concurrency: 1,
})
export class ExpiredTravelProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpiredTravelProcessor.name);
  private readonly STATS_KEY = 'scheduler:travel-cleanup:stats';

  constructor(
    private readonly travelService: TravelService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<TravelCleanupResult> {
    const startTime = Date.now();
    const result: TravelCleanupResult = {
      processedItems: 0,
      expiredTravels: 0,
      expiringTravels: 0,
      notificationsSet: 0,
      errors: [],
    };

    try {
      this.logger.log(`Starting ${job.name} job (ID: ${job.id})`);

      switch (job.name) {
        case 'cleanup-expired-travels':
          await this.cleanupExpiredTravels(job, result);
          break;
        case 'notify-expiring-travels':
          await this.notifyExpiringTravels(job, result);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      // 통계 저장
      const stats = {
        lastRunAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        ...result,
      };

      await this.redisService.set(
        `${this.STATS_KEY}:${job.name}`,
        JSON.stringify(stats),
        86400,
      );

      this.logger.log(
        `${job.name} completed: ${result.processedItems} travels processed in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`${job.name} failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 만료된 Travel 정리
   */
  private async cleanupExpiredTravels(job: Job, result: TravelCleanupResult) {
    await job.updateProgress(10);

    const now = new Date();

    // 만료된 활성 Travel 찾기
    const expiredTravels = await Travel.find({
      where: {
        status: TravelStatus.ACTIVE,
        endDate: LessThan(now),
      },
      take: 100,
    });

    await job.updateProgress(30);

    for (const travel of expiredTravels) {
      try {
        // Travel 상태를 비활성으로 변경
        travel.expire();
        await travel.save();

        result.processedItems++;
        result.expiredTravels++;

        // 관련 캐시 무효화
        await this.invalidateTravelCache(travel.id);

        // 참여자들에게 알림 설정
        await this.setExpiredNotification(travel.id);
        result.notificationsSet++;

        this.logger.debug(`Expired travel: ${travel.id} - ${travel.name}`);
      } catch (error) {
        const errorMsg = `Failed to expire travel ${travel.id}: ${error.message}`;
        this.logger.warn(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    await job.updateProgress(100);
  }

  /**
   * 만료 임박 Travel 알림
   */
  private async notifyExpiringTravels(job: Job, result: TravelCleanupResult) {
    await job.updateProgress(10);

    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // 3일 내 만료 예정인 Travel 찾기
    const expiringTravels = await Travel.find({
      where: {
        status: TravelStatus.ACTIVE,
        endDate: Between(now, threeDaysLater),
      },
      take: 100,
    });

    await job.updateProgress(30);

    for (const travel of expiringTravels) {
      try {
        // 만료 임박 알림이 이미 설정되었는지 확인
        const notificationKey = `travel:expiring:notified:${travel.id}`;
        const alreadyNotified = await this.redisService.get(notificationKey);

        if (!alreadyNotified) {
          // 알림 설정
          await this.setExpiringNotification(
            travel.id,
            travel.getDaysUntilExpiry(),
          );

          // 24시간 동안 중복 알림 방지
          await this.redisService.set(notificationKey, '1', 86400);

          result.processedItems++;
          result.expiringTravels++;
          result.notificationsSet++;

          this.logger.debug(
            `Set expiry notification for travel: ${travel.id} - ${travel.name} (${travel.getDaysUntilExpiry()} days remaining)`,
          );
        }
      } catch (error) {
        const errorMsg = `Failed to notify expiring travel ${travel.id}: ${error.message}`;
        this.logger.warn(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    await job.updateProgress(100);
  }

  /**
   * Travel 캐시 무효화
   */
  private async invalidateTravelCache(travelId: number) {
    try {
      const cacheKeys = [
        `travel:${travelId}`,
        `travel:${travelId}:*`,
        `travel:list:*`,
      ];

      for (const pattern of cacheKeys) {
        if (pattern.includes('*')) {
          // 패턴으로 키 찾기
          const keys = await this.redisService.getClient().keys(pattern);
          if (keys.length > 0) {
            await this.redisService.getClient().del(...keys);
          }
        } else {
          await this.redisService.del(pattern);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for travel ${travelId}`,
        error,
      );
    }
  }

  /**
   * 만료 알림 설정
   */
  private async setExpiredNotification(travelId: number) {
    try {
      // 알림 큐에 추가 (실제 알림 모듈과 연동 필요)
      const notificationData = {
        type: 'TRAVEL_EXPIRED',
        travelId,
        timestamp: new Date().toISOString(),
      };

      await this.redisService
        .getClient()
        .lpush('notifications:queue', JSON.stringify(notificationData));
    } catch (error) {
      this.logger.error(
        `Failed to set expired notification for travel ${travelId}`,
        error,
      );
    }
  }

  /**
   * 만료 임박 알림 설정
   */
  private async setExpiringNotification(
    travelId: number,
    daysRemaining: number,
  ) {
    try {
      const notificationData = {
        type: 'TRAVEL_EXPIRING',
        travelId,
        daysRemaining,
        timestamp: new Date().toISOString(),
      };

      await this.redisService
        .getClient()
        .lpush('notifications:queue', JSON.stringify(notificationData));
    } catch (error) {
      this.logger.error(
        `Failed to set expiring notification for travel ${travelId}`,
        error,
      );
    }
  }
}
