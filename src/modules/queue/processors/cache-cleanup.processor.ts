import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisService } from '../../cache/redis.service';

interface CacheCleanupResult {
  processedItems: number;
  expiredKeys: number;
  memoryFreed: number;
  errors: string[];
  memoryUsageBefore: number;
  memoryUsageAfter: number;
}

@Injectable()
@Processor('cache-cleanup', {
  concurrency: 1,
})
export class CacheCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CacheCleanupProcessor.name);
  private readonly STATS_KEY = 'scheduler:cache-cleanup:stats';

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<CacheCleanupResult> {
    const startTime = Date.now();
    const result: CacheCleanupResult = {
      processedItems: 0,
      expiredKeys: 0,
      memoryFreed: 0,
      errors: [],
      memoryUsageBefore: 0,
      memoryUsageAfter: 0,
    };

    try {
      this.logger.log(`Starting ${job.name} job (ID: ${job.id})`);

      // 메모리 사용량 측정 (시작 전)
      result.memoryUsageBefore = await this.getMemoryUsage();

      switch (job.name) {
        case 'cleanup-expired-cache':
          await this.cleanupExpiredCache(job, result);
          break;
        case 'optimize-memory':
          await this.optimizeMemory(job, result);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      // 메모리 사용량 측정 (종료 후)
      result.memoryUsageAfter = await this.getMemoryUsage();
      result.memoryFreed = result.memoryUsageBefore - result.memoryUsageAfter;

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
        `${job.name} completed: ${result.processedItems} keys processed, ${result.memoryFreed} bytes freed in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`${job.name} failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 만료된 캐시 정리
   */
  private async cleanupExpiredCache(job: Job, result: CacheCleanupResult) {
    await job.updateProgress(10);

    try {
      const client = this.redisService.getClient();
      
      // 캐시 키 패턴별로 정리
      const cachePatterns = [
        'cache:*',
        'session:*',
        'temp:*',
        'rate-limit:*',
      ];

      let totalProgress = 10;
      const progressPerPattern = 80 / cachePatterns.length;

      for (const pattern of cachePatterns) {
        const keys = await client.keys(pattern);
        
        for (const key of keys) {
          try {
            // TTL 확인
            const ttl = await client.ttl(key);
            
            // TTL이 없거나 매우 오래된 키 삭제
            if (ttl === -1) {
              // TTL이 설정되지 않은 키 - 30일 이상된 것으로 추정
              const idleTime = await client.object('IDLETIME', key) as number | null;
              if (idleTime && idleTime > 2592000) { // 30일 in seconds
                await client.del(key);
                result.expiredKeys++;
                result.processedItems++;
                this.logger.debug(`Deleted idle key: ${key} (idle for ${idleTime} seconds)`);
              }
            } else if (ttl === -2) {
              // 이미 만료된 키 (존재하지 않음)
              continue;
            }
            
            // 곧 만료될 키는 Redis가 자동으로 처리하도록 놔둠
          } catch (error) {
            const errorMsg = `Failed to process key ${key}: ${error.message}`;
            this.logger.warn(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        totalProgress += progressPerPattern;
        await job.updateProgress(Math.min(totalProgress, 90));
      }

      await job.updateProgress(100);
    } catch (error) {
      this.logger.error('Cache cleanup error', error);
      throw error;
    }
  }

  /**
   * 메모리 최적화
   */
  private async optimizeMemory(job: Job, result: CacheCleanupResult) {
    await job.updateProgress(10);

    try {
      const client = this.redisService.getClient();

      // 1. 메모리 통계 수집
      const memoryStats = await this.getMemoryStats();
      this.logger.debug('Memory stats before optimization:', memoryStats);

      await job.updateProgress(20);

      // 2. 큰 키 찾기 및 처리
      const bigKeys = await this.findBigKeys();
      for (const key of bigKeys) {
        try {
          const memoryUsage = await client.memory('USAGE', key);
          if (memoryUsage && memoryUsage > 1048576) { // 1MB 이상
            // 큰 키에 대한 TTL 설정 (없으면)
            const ttl = await client.ttl(key);
            if (ttl === -1) {
              await client.expire(key, 3600); // 1시간 TTL 설정
              this.logger.debug(`Set TTL for big key: ${key} (${memoryUsage} bytes)`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process big key ${key}: ${error.message}`;
          this.logger.warn(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      await job.updateProgress(50);

      // 3. 오래된 세션 정리
      await this.cleanupOldSessions(result);

      await job.updateProgress(70);

      // 4. 메모리 조각화 해결 (Redis가 지원하는 경우)
      try {
        // MEMORY PURGE 명령 실행 (Redis 4.0+)
        await client.call('MEMORY', 'PURGE');
        this.logger.debug('Memory purge executed');
      } catch (error) {
        // 명령이 지원되지 않을 수 있음
        this.logger.debug('Memory purge not supported or failed:', error.message);
      }

      await job.updateProgress(90);

      // 5. 통계 업데이트
      result.processedItems = bigKeys.length;

      await job.updateProgress(100);
    } catch (error) {
      this.logger.error('Memory optimization error', error);
      throw error;
    }
  }

  /**
   * 메모리 사용량 조회
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const info = await this.redisService.getClient().info('memory');
      const match = info.match(/used_memory:(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      this.logger.error('Failed to get memory usage', error);
      return 0;
    }
  }

  /**
   * 메모리 통계 조회
   */
  private async getMemoryStats() {
    try {
      const client = this.redisService.getClient();
      const info = await client.info('memory');
      
      const stats: any = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
      
      return {
        usedMemory: stats.used_memory_human,
        usedMemoryRss: stats.used_memory_rss_human,
        peakMemory: stats.used_memory_peak_human,
        memoryFragmentation: stats.mem_fragmentation_ratio,
      };
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      return {};
    }
  }

  /**
   * 큰 키 찾기
   */
  private async findBigKeys(): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      const bigKeys: string[] = [];
      
      // 샘플링으로 큰 키 찾기
      const sampleKeys = await client.call('RANDOMKEY') as string;
      if (sampleKeys) {
        const memoryUsage = await client.memory('USAGE', sampleKeys);
        if (memoryUsage && memoryUsage > 524288) { // 512KB 이상
          bigKeys.push(sampleKeys);
        }
      }
      
      // 알려진 큰 키 패턴 확인
      const patterns = ['large:*', 'bulk:*', 'report:*'];
      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        bigKeys.push(...keys.slice(0, 10)); // 각 패턴당 최대 10개
      }
      
      return bigKeys;
    } catch (error) {
      this.logger.error('Failed to find big keys', error);
      return [];
    }
  }

  /**
   * 오래된 세션 정리
   */
  private async cleanupOldSessions(result: CacheCleanupResult) {
    try {
      const client = this.redisService.getClient();
      const sessionKeys = await client.keys('session:*');
      
      for (const key of sessionKeys) {
        const idleTime = await client.object('IDLETIME', key) as number | null;
        if (idleTime && idleTime > 86400) { // 24시간 이상 유휴
          await client.del(key);
          result.expiredKeys++;
          result.processedItems++;
          this.logger.debug(`Deleted idle session: ${key}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old sessions', error);
    }
  }
}