import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import { FileUpload } from '../file-upload/file-upload.entity';
import { FileUploadStatus } from '../file-upload/enums/file-upload-status.enum';
import { StorageService } from '../storage/storage.service';
import { SchedulerStats } from './types/scheduler-stats.interface';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  // Redis 캐시 키
  private readonly SCHEDULER_STATS_KEY = 'scheduler:stats';
  private readonly SCHEDULER_LOCK_KEY = 'scheduler:lock';

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
    private readonly redisService: RedisService,
    private readonly storageService: StorageService,
  ) {}

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

        // 3. 고아 파일 찾기 및 정리 (참조되지 않는 파일)
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
