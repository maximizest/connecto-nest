import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { Between, LessThan, Not, Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import {
  FileUpload,
  FileUploadStatus,
} from '../file-upload/file-upload.entity';
import { Message } from '../message/message.entity';
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../notification/notification.entity';
import { NotificationService } from '../notification/notification.service';
import { Planet } from '../planet/planet.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { StorageService } from '../storage/storage.service';
import { Travel, TravelStatus } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import {
  VideoProcessing,
  VideoProcessingStatus,
} from '../video-processing/video-processing.entity';

/**
 * 스케줄링 작업 통계
 */
interface SchedulerStats {
  taskName: string;
  lastRunAt: Date;
  nextRunAt?: Date;
  status: 'success' | 'failed' | 'running';
  processedItems: number;
  duration: number; // milliseconds
  errorMessage?: string;
  metrics: Record<string, any>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  // Redis 캐시 키
  private readonly SCHEDULER_STATS_KEY = 'scheduler:stats';
  private readonly SCHEDULER_LOCK_KEY = 'scheduler:lock';

  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageReadReceipt)
    private readonly messageReadReceiptRepository: Repository<MessageReadReceipt>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
    @InjectRepository(VideoProcessing)
    private readonly videoProcessingRepository: Repository<VideoProcessing>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly redisService: RedisService,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==============================
  // Travel 만기 관리 작업
  // ==============================

  /**
   * 매일 자정에 만료된 Travel 처리
   * Travel 만료 시 모든 Planet 비활성화 및 알림 전송
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processExpiredTravels(): Promise<void> {
    const taskName = 'processExpiredTravels';
    const startTime = Date.now();
    let processedItems = 0;
    let stats: SchedulerStats;

    try {
      this.logger.log('Starting expired travels processing...');

      // 락을 사용하여 중복 실행 방지
      const lockKey = `${this.SCHEDULER_LOCK_KEY}:${taskName}`;
      const acquired = await this.acquireLock(lockKey, 3600); // 1시간 락

      if (!acquired) {
        this.logger.warn(`Task ${taskName} is already running, skipping...`);
        return;
      }

      try {
        const today = new Date();

        // 만료된 Travel 조회
        const expiredTravels = await this.travelRepository.find({
          where: {
            expiryDate: LessThan(today),
            status: Not(TravelStatus.EXPIRED),
          },
          relations: ['planets', 'travelUsers'],
        });

        this.logger.log(`Found ${expiredTravels.length} expired travels`);

        for (const travel of expiredTravels) {
          try {
            // Travel 상태를 만료로 변경
            travel.status = TravelStatus.EXPIRED;
            travel.isActive = false;
            await this.travelRepository.save(travel);

            // 모든 소속 Planet 비활성화
            // 관련 Planet들 비활성화
            const planets = await this.planetRepository.find({
              where: { travelId: travel.id },
            });

            for (const planet of planets) {
              planet.archive();
              await this.planetRepository.save(planet);
            }

            // 만료 알림 전송 (모든 멤버에게)
            const memberUserIds = travel.travelUsers.map((tu) => tu.userId);

            if (memberUserIds.length > 0) {
              await this.notificationService.createBulkNotifications({
                type: NotificationType.TRAVEL_EXPIRED,
                title: 'Travel이 만료되었습니다',
                content: `"${travel.name}" Travel이 만료되어 모든 채팅방이 비활성화되었습니다.`,
                userIds: memberUserIds,
                priority: NotificationPriority.HIGH,
                channels: [
                  NotificationChannel.IN_APP,
                  NotificationChannel.PUSH,
                ],
                travelId: travel.id,
                data: {
                  travelName: travel.name,
                  expiryDate: travel.expiryDate,
                  affectedPlanets: travel.planets?.length || 0,
                  actionRequired: false,
                },
              });
            }

            // 이벤트 발행
            this.eventEmitter.emit('travel.expired', {
              travel,
              expiredAt: today,
              affectedPlanets: travel.planets?.length || 0,
              affectedMembers: memberUserIds.length,
            });

            processedItems++;

            this.logger.log(
              `Processed expired travel: ${travel.id} (${travel.name}), affected ${travel.planets?.length || 0} planets`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to process expired travel ${travel.id}: ${error.message}`,
            );
          }
        }

        stats = {
          taskName,
          lastRunAt: new Date(),
          status: 'success',
          processedItems,
          duration: Date.now() - startTime,
          metrics: {
            expiredTravels: expiredTravels.length,
            successfullyProcessed: processedItems,
          },
        };

        this.logger.log(
          `Expired travels processing completed: ${processedItems}/${expiredTravels.length} processed`,
        );
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Expired travels processing failed: ${error.message}`,
        error.stack,
      );

      stats = {
        taskName,
        lastRunAt: new Date(),
        status: 'failed',
        processedItems,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        metrics: {},
      };
    }

    // 통계 저장
    await this.saveTaskStats(stats);
  }

  /**
   * 만료 7일 전 경고 알림 (매일 오전 9시)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendExpiryWarnings(): Promise<void> {
    const taskName = 'sendExpiryWarnings';
    const startTime = Date.now();
    let processedItems = 0;

    try {
      this.logger.log('Starting expiry warnings...');

      // 락을 사용하여 중복 실행 방지
      const lockKey = `${this.SCHEDULER_LOCK_KEY}:${taskName}`;
      const acquired = await this.acquireLock(lockKey, 1800); // 30분 락

      if (!acquired) {
        this.logger.warn(`Task ${taskName} is already running, skipping...`);
        return;
      }

      try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const oneDayFromNow = new Date();
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

        // 7일 후 만료 경고
        const sevenDayWarnings = await this.travelRepository.find({
          where: {
            expiryDate: Between(sevenDaysFromNow, addDays(sevenDaysFromNow, 1)),
            status: TravelStatus.ACTIVE,
          },
          relations: ['travelUsers'],
        });

        // 3일 후 만료 경고
        const threeDayWarnings = await this.travelRepository.find({
          where: {
            expiryDate: Between(threeDaysFromNow, addDays(threeDaysFromNow, 1)),
            status: TravelStatus.ACTIVE,
          },
          relations: ['travelUsers'],
        });

        // 1일 후 만료 경고
        const oneDayWarnings = await this.travelRepository.find({
          where: {
            expiryDate: Between(oneDayFromNow, addDays(oneDayFromNow, 1)),
            status: TravelStatus.ACTIVE,
          },
          relations: ['travelUsers'],
        });

        // 7일 전 경고 발송
        for (const travel of sevenDayWarnings) {
          await this.sendExpiryWarning(travel, 7);
          processedItems++;
        }

        // 3일 전 경고 발송
        for (const travel of threeDayWarnings) {
          await this.sendExpiryWarning(travel, 3);
          processedItems++;
        }

        // 1일 전 경고 발송
        for (const travel of oneDayWarnings) {
          await this.sendExpiryWarning(travel, 1);
          processedItems++;
        }

        const stats: SchedulerStats = {
          taskName,
          lastRunAt: new Date(),
          status: 'success',
          processedItems,
          duration: Date.now() - startTime,
          metrics: {
            sevenDayWarnings: sevenDayWarnings.length,
            threeDayWarnings: threeDayWarnings.length,
            oneDayWarnings: oneDayWarnings.length,
          },
        };

        await this.saveTaskStats(stats);

        this.logger.log(
          `Expiry warnings completed: ${processedItems} warnings sent`,
        );
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Expiry warnings failed: ${error.message}`,
        error.stack,
      );

      const stats: SchedulerStats = {
        taskName,
        lastRunAt: new Date(),
        status: 'failed',
        processedItems,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        metrics: {},
      };

      await this.saveTaskStats(stats);
    }
  }

  // ==============================
  // 대용량 파일 정리 작업
  // ==============================

  /**
   * 매일 새벽 2시에 대용량 파일 정리
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupLargeFiles(): Promise<void> {
    const taskName = 'cleanupLargeFiles';
    const startTime = Date.now();
    let processedItems = 0;

    try {
      this.logger.log('Starting large file cleanup...');

      const lockKey = `${this.SCHEDULER_LOCK_KEY}:${taskName}`;
      const acquired = await this.acquireLock(lockKey, 7200); // 2시간 락

      if (!acquired) {
        this.logger.warn(`Task ${taskName} is already running, skipping...`);
        return;
      }

      try {
        // 1. 실패한 업로드 파일 정리 (24시간 이상 된 것)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const failedUploads = await this.fileUploadRepository.find({
          where: {
            status: FileUploadStatus.FAILED,
            createdAt: LessThan(oneDayAgo),
          },
        });

        for (const upload of failedUploads) {
          try {
            // 스토리지에서 파일 삭제
            if (upload.storageKey) {
              await this.storageService.deleteFile(upload.storageKey);
            }

            // DB 레코드 삭제
            await this.fileUploadRepository.remove(upload);
            processedItems++;

            this.logger.debug(`Cleaned up failed upload: ${upload.id}`);
          } catch (error) {
            this.logger.warn(
              `Failed to cleanup upload ${upload.id}: ${error.message}`,
            );
          }
        }

        // 2. 오래된 임시 파일 정리 (7일 이상)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const oldTempUploads = await this.fileUploadRepository.find({
          where: {
            folder: 'temp',
            createdAt: LessThan(oneWeekAgo),
          },
        });

        for (const upload of oldTempUploads) {
          try {
            if (upload.storageKey) {
              await this.storageService.deleteFile(upload.storageKey);
            }

            await this.fileUploadRepository.remove(upload);
            processedItems++;

            this.logger.debug(`Cleaned up temp file: ${upload.id}`);
          } catch (error) {
            this.logger.warn(
              `Failed to cleanup temp file ${upload.id}: ${error.message}`,
            );
          }
        }

        // 3. 완료되지 않은 비디오 프로세싱 정리 (3일 이상)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const staleVideoProcessing = await this.videoProcessingRepository.find({
          where: {
            status: VideoProcessingStatus.PROCESSING,
            startedAt: LessThan(threeDaysAgo),
          },
        });

        for (const processing of staleVideoProcessing) {
          try {
            // 상태를 실패로 변경
            processing.status = VideoProcessingStatus.FAILED;
            processing.errorMessage =
              'Processing timeout - cleaned up by scheduler';
            processing.completedAt = new Date();

            await this.videoProcessingRepository.save(processing);

            // 관련 임시 파일들 정리
            if (processing.outputStorageKeys) {
              const keys = processing.outputStorageKeys.split(',');
              for (const key of keys) {
                await this.storageService.deleteFile(key.trim());
              }
            }

            processedItems++;

            this.logger.debug(
              `Cleaned up stale video processing: ${processing.id}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to cleanup video processing ${processing.id}: ${error.message}`,
            );
          }
        }

        // 4. 고아 파일 찾기 및 정리 (참조되지 않는 파일)
        const orphanedFiles = await this.findOrphanedFiles();
        for (const fileKey of orphanedFiles) {
          try {
            await this.storageService.deleteFile(fileKey);
            processedItems++;

            this.logger.debug(`Cleaned up orphaned file: ${fileKey}`);
          } catch (error) {
            this.logger.warn(
              `Failed to cleanup orphaned file ${fileKey}: ${error.message}`,
            );
          }
        }

        const stats: SchedulerStats = {
          taskName,
          lastRunAt: new Date(),
          status: 'success',
          processedItems,
          duration: Date.now() - startTime,
          metrics: {
            failedUploads: failedUploads.length,
            tempFiles: oldTempUploads.length,
            staleVideoProcessing: staleVideoProcessing.length,
            orphanedFiles: orphanedFiles.length,
          },
        };

        await this.saveTaskStats(stats);

        this.logger.log(
          `Large file cleanup completed: ${processedItems} files cleaned`,
        );
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Large file cleanup failed: ${error.message}`,
        error.stack,
      );

      const stats: SchedulerStats = {
        taskName,
        lastRunAt: new Date(),
        status: 'failed',
        processedItems,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        metrics: {},
      };

      await this.saveTaskStats(stats);
    }
  }

  // ==============================
  // 데이터 정리 작업
  // ==============================

  /**
   * 매주 일요일 오전 3시에 오래된 데이터 정리
   */
  @Cron('0 3 * * 0') // 매주 일요일 3시
  async cleanupOldData(): Promise<void> {
    const taskName = 'cleanupOldData';
    const startTime = Date.now();
    let processedItems = 0;

    try {
      this.logger.log('Starting old data cleanup...');

      // 락을 사용하여 중복 실행 방지
      const lockKey = `${this.SCHEDULER_LOCK_KEY}:${taskName}`;
      const acquired = await this.acquireLock(lockKey, 7200); // 2시간 락

      if (!acquired) {
        this.logger.warn(`Task ${taskName} is already running, skipping...`);
        return;
      }

      try {
        // 1. 오래된 읽음 영수증 정리 (90일 이상)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const oldReadReceipts = await this.messageReadReceiptRepository.delete({
          createdAt: LessThan(threeMonthsAgo),
        });

        processedItems += oldReadReceipts.affected || 0;

        // 2. 오래된 알림 정리 (30일 이상, 읽음 처리된 것)
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

        const oldNotifications = await this.notificationRepository.delete({
          createdAt: LessThan(oneMonthAgo),
          isRead: true,
        });

        processedItems += oldNotifications.affected || 0;

        // 3. 오래된 분석 데이터 정리 (1년 이상, 일일 데이터만)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // 4. 비활성 사용자 정리 (6개월 이상 로그인하지 않은 사용자의 임시 데이터)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const inactiveUsers = await this.userRepository.find({
          where: {
            lastSeenAt: LessThan(sixMonthsAgo),
          },
          select: ['id'],
        });

        // 비활성 사용자의 알림 정리
        for (const user of inactiveUsers) {
          const deletedNotifications = await this.notificationRepository.delete(
            {
              userId: user.id,
              isRead: true,
            },
          );
          processedItems += deletedNotifications.affected || 0;
        }

        const stats: SchedulerStats = {
          taskName,
          lastRunAt: new Date(),
          status: 'success',
          processedItems,
          duration: Date.now() - startTime,
          metrics: {
            oldReadReceipts: oldReadReceipts.affected || 0,
            oldNotifications: oldNotifications.affected || 0,
            inactiveUsers: inactiveUsers.length,
          },
        };

        await this.saveTaskStats(stats);

        this.logger.log(
          `Old data cleanup completed: ${processedItems} records cleaned`,
        );
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Old data cleanup failed: ${error.message}`,
        error.stack,
      );

      const stats: SchedulerStats = {
        taskName,
        lastRunAt: new Date(),
        status: 'failed',
        processedItems,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        metrics: {},
      };

      await this.saveTaskStats(stats);
    }
  }

  // ==============================
  // 캐시 관리 작업
  // ==============================

  /**
   * 매시간 캐시 최적화 및 정리
   */
  @Cron(CronExpression.EVERY_HOUR)
  async optimizeCache(): Promise<void> {
    const taskName = 'optimizeCache';
    const startTime = Date.now();
    let processedItems = 0;

    try {
      this.logger.debug('Starting cache optimization...');

      // 락을 사용하여 중복 실행 방지
      const lockKey = `${this.SCHEDULER_LOCK_KEY}:${taskName}`;
      const acquired = await this.acquireLock(lockKey, 900); // 15분 락

      if (!acquired) {
        this.logger.debug(`Task ${taskName} is already running, skipping...`);
        return;
      }

      try {
        // 만료된 키 정리
        const expiredKeys = await this.redisService.getKeys('*:expired');
        for (const key of expiredKeys.slice(0, 100)) {
          // 한번에 최대 100개
          await this.redisService.del(key);
          processedItems++;
        }

        // 메모리 사용량 체크
        const memoryUsage = await this.redisService.getMemoryUsage();

        const stats: SchedulerStats = {
          taskName,
          lastRunAt: new Date(),
          status: 'success',
          processedItems,
          duration: Date.now() - startTime,
          metrics: {
            expiredKeysRemoved: processedItems,
            memoryUsage,
          },
        };

        await this.saveTaskStats(stats);

        this.logger.debug(
          `Cache optimization completed: ${processedItems} expired keys removed`,
        );
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      this.logger.error(`Cache optimization failed: ${error.message}`);

      const stats: SchedulerStats = {
        taskName,
        lastRunAt: new Date(),
        status: 'failed',
        processedItems,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        metrics: {},
      };

      await this.saveTaskStats(stats);
    }
  }

  // ==============================
  // Helper Methods
  // ==============================

  /**
   * 만료 경고 알림 전송
   */
  private async sendExpiryWarning(
    travel: Travel,
    daysLeft: number,
  ): Promise<void> {
    try {
      const memberUserIds = travel.travelUsers.map((tu) => tu.userId);

      if (memberUserIds.length === 0) return;

      let title: string;
      let priority: NotificationPriority;

      switch (daysLeft) {
        case 7:
          title = 'Travel이 일주일 후 만료됩니다';
          priority = NotificationPriority.NORMAL;
          break;
        case 3:
          title = 'Travel이 3일 후 만료됩니다';
          priority = NotificationPriority.HIGH;
          break;
        case 1:
          title = 'Travel이 내일 만료됩니다';
          priority = NotificationPriority.URGENT;
          break;
        default:
          return;
      }

      await this.notificationService.createBulkNotifications({
        type: NotificationType.TRAVEL_EXPIRY_WARNING,
        title,
        content: `"${travel.name}" Travel이 ${daysLeft}일 후 만료됩니다. 연장이 필요한 경우 미리 준비해주세요.`,
        userIds: memberUserIds,
        priority,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        travelId: travel.id,
        data: {
          travelName: travel.name,
          expiryDate: travel.expiryDate,
          daysLeft,
          actionRequired: daysLeft <= 3,
        },
      });

      this.logger.log(
        `Sent expiry warning for travel ${travel.id}: ${daysLeft} days left`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send expiry warning for travel ${travel.id}: ${error.message}`,
      );
    }
  }

  /**
   * 고아 파일 찾기 (참조되지 않는 파일)
   */
  private async findOrphanedFiles(): Promise<string[]> {
    // 간단한 구현 - 실제로는 더 정교한 로직 필요
    // 스토리지의 모든 파일과 DB의 참조를 비교하여 고아 파일 찾기
    return [];
  }

  /**
   * 분산 락 획득 (개선된 버전)
   */
  private async acquireLock(lockKey: string, ttl: number): Promise<boolean> {
    try {
      const lockValue = `${process.pid}_${Date.now()}_${Math.random()}`; // 고유한 락 값

      // Redis lock 설정 (NX 옵션은 ioredis의 set 명령어로 구현)
      const result = await this.redisService
        .getClient()
        .set(lockKey, lockValue, 'EX', ttl, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Lock acquired: ${lockKey} with value: ${lockValue}`);
        return true;
      }

      // 기존 락 정보 확인
      const existingValue = await this.redisService.get(lockKey);
      this.logger.warn(
        `Failed to acquire lock ${lockKey}, existing value: ${existingValue}`,
      );

      return false;
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * 분산 락 해제 (안전한 해제)
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      const result = await this.redisService.del(lockKey);
      if (result > 0) {
        this.logger.debug(`Lock released: ${lockKey}`);
      } else {
        this.logger.warn(`Lock was already released or expired: ${lockKey}`);
      }
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}: ${error.message}`);
    }
  }

  /**
   * 락 상태 확인
   */
  private async isLockActive(lockKey: string): Promise<boolean> {
    try {
      const value = await this.redisService.get(lockKey);
      return value !== null;
    } catch (error) {
      this.logger.error(
        `Failed to check lock status ${lockKey}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 모든 활성 락 조회 (모니터링용)
   */
  async getActiveLocks(): Promise<Record<string, string>> {
    try {
      const lockPattern = `${this.SCHEDULER_LOCK_KEY}:*`;
      const keys = await this.redisService.getKeys(lockPattern);
      const locks: Record<string, string> = {};

      for (const key of keys) {
        const value = await this.redisService.get(key);
        if (value) {
          const taskName = key.replace(`${this.SCHEDULER_LOCK_KEY}:`, '');
          locks[taskName] = value;
        }
      }

      return locks;
    } catch (error) {
      this.logger.error(`Failed to get active locks: ${error.message}`);
      return {};
    }
  }

  /**
   * 작업 통계 저장
   */
  private async saveTaskStats(stats: SchedulerStats): Promise<void> {
    try {
      const statsKey = `${this.SCHEDULER_STATS_KEY}:${stats.taskName}`;
      await this.redisService.setJson(statsKey, stats, 86400 * 7); // 7일 보관

      // 최근 실행 목록에도 추가
      const recentKey = `${this.SCHEDULER_STATS_KEY}:recent`;
      const recent =
        (await this.redisService.getJson<SchedulerStats[]>(recentKey)) || [];

      recent.unshift(stats);
      const trimmed = recent.slice(0, 100); // 최근 100개만 보관

      await this.redisService.setJson(recentKey, trimmed, 86400 * 7);
    } catch (error) {
      this.logger.error(`Failed to save task stats: ${error.message}`);
    }
  }

  /**
   * 스케줄러 상태 조회
   */
  async getSchedulerStatus(): Promise<{
    tasks: SchedulerStats[];
    summary: {
      totalTasks: number;
      successfulTasks: number;
      failedTasks: number;
      averageDuration: number;
    };
  }> {
    try {
      const recentKey = `${this.SCHEDULER_STATS_KEY}:recent`;
      const tasks =
        (await this.redisService.getJson<SchedulerStats[]>(recentKey)) || [];

      const summary = {
        totalTasks: tasks.length,
        successfulTasks: tasks.filter((t) => t.status === 'success').length,
        failedTasks: tasks.filter((t) => t.status === 'failed').length,
        averageDuration:
          tasks.length > 0
            ? Math.round(
                tasks.reduce((sum, t) => sum + t.duration, 0) / tasks.length,
              )
            : 0,
      };

      return { tasks, summary };
    } catch (error) {
      this.logger.error(`Failed to get scheduler status: ${error.message}`);
      return {
        tasks: [],
        summary: {
          totalTasks: 0,
          successfulTasks: 0,
          failedTasks: 0,
          averageDuration: 0,
        },
      };
    }
  }
}
