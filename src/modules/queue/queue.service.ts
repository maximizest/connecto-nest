import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('file-cleanup') private fileCleanupQueue: Queue,
    @InjectQueue('expired-travel') private expiredTravelQueue: Queue,
    @InjectQueue('cache-cleanup') private cacheCleanupQueue: Queue,
  ) {
    this.initializeScheduledJobs();
  }

  /**
   * 스케줄된 작업 초기화
   * BullMQ의 반복 작업(Repeatable Jobs) 설정
   */
  private async initializeScheduledJobs() {
    try {
      // 대용량 파일 정리 - 매일 새벽 2시
      await this.fileCleanupQueue.add(
        'cleanup-large-files',
        {},
        {
          repeat: {
            pattern: '0 2 * * *', // Cron 표현식: 매일 02:00
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-large-file-cleanup',
        },
      );

      // 실패한 업로드 정리 - 매 시간
      await this.fileCleanupQueue.add(
        'cleanup-failed-uploads',
        {},
        {
          repeat: {
            pattern: '0 * * * *', // 매 시간 정각
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-failed-upload-cleanup',
        },
      );

      // 만료된 Travel 정리 - 매일 새벽 3시
      await this.expiredTravelQueue.add(
        'cleanup-expired-travels',
        {},
        {
          repeat: {
            pattern: '0 3 * * *', // 매일 03:00
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-expired-travel-cleanup',
        },
      );

      // 만료 임박 Travel 알림 - 매일 오전 9시
      await this.expiredTravelQueue.add(
        'notify-expiring-travels',
        {},
        {
          repeat: {
            pattern: '0 9 * * *', // 매일 09:00
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-travel-expiry-notification',
        },
      );

      // 캐시 정리 - 매 30분
      await this.cacheCleanupQueue.add(
        'cleanup-expired-cache',
        {},
        {
          repeat: {
            pattern: '*/30 * * * *', // 30분마다
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-cache-cleanup',
        },
      );

      // 메모리 최적화 - 매일 새벽 4시
      await this.cacheCleanupQueue.add(
        'optimize-memory',
        {},
        {
          repeat: {
            pattern: '0 4 * * *', // 매일 04:00
            tz: 'Asia/Seoul',
          },
          jobId: 'scheduled-memory-optimization',
        },
      );

      this.logger.log('✅ Scheduled jobs initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize scheduled jobs', error);
    }
  }

  /**
   * 수동으로 파일 정리 작업 트리거
   */
  async triggerFileCleanup(type: 'large' | 'failed' = 'large') {
    const jobName =
      type === 'large' ? 'cleanup-large-files' : 'cleanup-failed-uploads';
    const job = await this.fileCleanupQueue.add(
      jobName,
      { triggeredManually: true },
      {
        priority: 1, // 높은 우선순위
      },
    );

    this.logger.log(
      `Manual file cleanup triggered: ${jobName}, Job ID: ${job.id}`,
    );
    return job;
  }

  /**
   * 수동으로 Travel 정리 작업 트리거
   */
  async triggerTravelCleanup() {
    const job = await this.expiredTravelQueue.add(
      'cleanup-expired-travels',
      { triggeredManually: true },
      {
        priority: 1,
      },
    );

    this.logger.log(`Manual travel cleanup triggered, Job ID: ${job.id}`);
    return job;
  }

  /**
   * 수동으로 캐시 정리 작업 트리거
   */
  async triggerCacheCleanup() {
    const job = await this.cacheCleanupQueue.add(
      'cleanup-expired-cache',
      { triggeredManually: true },
      {
        priority: 1,
      },
    );

    this.logger.log(`Manual cache cleanup triggered, Job ID: ${job.id}`);
    return job;
  }

  /**
   * 작업 상태 조회
   */
  async getJobStatus(queueName: string, jobId: string) {
    let queue: Queue;

    switch (queueName) {
      case 'file-cleanup':
        queue = this.fileCleanupQueue;
        break;
      case 'expired-travel':
        queue = this.expiredTravelQueue;
        break;
      case 'cache-cleanup':
        queue = this.cacheCleanupQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      returnvalue: job.returnvalue,
    };
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStats() {
    const [fileStats, travelStats, cacheStats] = await Promise.all([
      this.getQueueMetrics(this.fileCleanupQueue),
      this.getQueueMetrics(this.expiredTravelQueue),
      this.getQueueMetrics(this.cacheCleanupQueue),
    ]);

    return {
      'file-cleanup': fileStats,
      'expired-travel': travelStats,
      'cache-cleanup': cacheStats,
    };
  }

  private async getQueueMetrics(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}
