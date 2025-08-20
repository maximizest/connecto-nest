import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../cache/redis.service';
import { SchedulerStats } from './types/scheduler-stats.interface';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  // Redis 캐시 키
  private readonly SCHEDULER_STATS_KEY = 'scheduler:stats';

  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('Scheduler service initialized with BullMQ');
  }

  // ==============================
  // Manual Trigger Methods (BullMQ로 위임)
  // ==============================

  /**
   * 수동으로 대용량 파일 정리 트리거
   * @deprecated Use QueueService.triggerFileCleanup() instead
   */
  async triggerLargeFileCleanup(): Promise<void> {
    try {
      const job = await this.queueService.triggerFileCleanup('large');
      this.logger.log(`File cleanup job triggered: ${job.id}`);
    } catch (_error) {
      this.logger.error('Failed to trigger file cleanup', _error);
      throw _error;
    }
  }

  /**
   * 수동으로 실패한 업로드 정리 트리거
   */
  async triggerFailedUploadCleanup(): Promise<void> {
    try {
      const job = await this.queueService.triggerFileCleanup('failed');
      this.logger.log(`Failed upload cleanup job triggered: ${job.id}`);
    } catch (_error) {
      this.logger.error('Failed to trigger failed upload cleanup', _error);
      throw _error;
    }
  }

  /**
   * 수동으로 Travel 정리 트리거
   */
  async triggerTravelCleanup(): Promise<void> {
    try {
      const job = await this.queueService.triggerTravelCleanup();
      this.logger.log(`Travel cleanup job triggered: ${job.id}`);
    } catch (_error) {
      this.logger.error('Failed to trigger travel cleanup', _error);
      throw _error;
    }
  }

  /**
   * 수동으로 캐시 정리 트리거
   */
  async triggerCacheCleanup(): Promise<void> {
    try {
      const job = await this.queueService.triggerCacheCleanup();
      this.logger.log(`Cache cleanup job triggered: ${job.id}`);
    } catch (_error) {
      this.logger.error('Failed to trigger cache cleanup', _error);
      throw _error;
    }
  }

  // ==============================
  // Stats & Monitoring (BullMQ 통계 조회)
  // ==============================

  /**
   * 모든 스케줄러 통계 조회
   */
  async getAllStats(): Promise<any> {
    try {
      // BullMQ 큐 통계 조회
      const queueStats = await this.queueService.getQueueStats();

      // Redis에서 저장된 작업 통계 조회
      const taskStats: Record<string, any> = {};
      const statsKeys = await this.redisService
        .getClient()
        .keys(`${this.SCHEDULER_STATS_KEY}:*`);

      for (const key of statsKeys) {
        const taskName = key.split(':').pop();
        if (taskName) {
          const stats = await this.redisService.get(key);
          if (stats) {
            taskStats[taskName] = JSON.parse(stats);
          }
        }
      }

      return {
        queues: queueStats,
        tasks: taskStats,
        timestamp: new Date().toISOString(),
      };
    } catch (_error) {
      this.logger.error('Failed to get scheduler stats', _error);
      return {
        error: _error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 특정 작업의 통계 조회
   */
  async getTaskStats(taskName: string): Promise<SchedulerStats | null> {
    try {
      const stats = await this.redisService.get(
        `${this.SCHEDULER_STATS_KEY}:${taskName}`,
      );
      return stats ? JSON.parse(stats) : null;
    } catch (_error) {
      this.logger.error(`Failed to get stats for task ${taskName}`, _error);
      return null;
    }
  }

  /**
   * 작업 상태 조회
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    try {
      return await this.queueService.getJobStatus(queueName, jobId);
    } catch (_error) {
      this.logger.error(
        `Failed to get job status for ${queueName}:${jobId}`,
        _error,
      );
      return null;
    }
  }

  /**
   * 스케줄러 헬스 체크
   */
  async healthCheck(): Promise<{
    status: string;
    queues: any;
    redis: boolean;
    timestamp: string;
  }> {
    try {
      const queueStats = await this.queueService.getQueueStats();
      const redisPing = await this.redisService.getClient().ping();

      return {
        status: 'healthy',
        queues: queueStats,
        redis: redisPing === 'PONG',
        timestamp: new Date().toISOString(),
      };
    } catch (_error) {
      this.logger.error('Health check failed', _error);
      return {
        status: 'unhealthy',
        queues: {},
        redis: false,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
