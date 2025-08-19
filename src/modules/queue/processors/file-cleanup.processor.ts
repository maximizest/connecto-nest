import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LessThan } from 'typeorm';
import { FileUpload } from '../../file-upload/file-upload.entity';
import { FileUploadStatus } from '../../file-upload/enums/file-upload-status.enum';
import { StorageService } from '../../storage/storage.service';
import { RedisService } from '../../cache/redis.service';

interface FileCleanupResult {
  processedItems: number;
  failedUploads: number;
  tempFiles: number;
  orphanedFiles: number;
  errors: string[];
}

@Injectable()
@Processor('file-cleanup', {
  concurrency: 1, // 한 번에 하나의 작업만 처리
})
export class FileCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(FileCleanupProcessor.name);
  private readonly STATS_KEY = 'scheduler:file-cleanup:stats';

  constructor(
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<FileCleanupResult> {
    const startTime = Date.now();
    const result: FileCleanupResult = {
      processedItems: 0,
      failedUploads: 0,
      tempFiles: 0,
      orphanedFiles: 0,
      errors: [],
    };

    try {
      this.logger.log(`Starting ${job.name} job (ID: ${job.id})`);

      switch (job.name) {
        case 'cleanup-large-files':
          await this.cleanupLargeFiles(job, result);
          break;
        case 'cleanup-failed-uploads':
          await this.cleanupFailedUploads(job, result);
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
        86400, // 24시간 보관
      );

      this.logger.log(
        `${job.name} completed: ${result.processedItems} items processed in ${Date.now() - startTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`${job.name} failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 대용량 파일 정리
   */
  private async cleanupLargeFiles(job: Job, result: FileCleanupResult) {
    // 진행률 보고
    await job.updateProgress(10);

    // 1. 실패한 업로드 파일 정리 (24시간 이상 된 것)
    await this.cleanupFailedUploadsInternal(result);
    await job.updateProgress(30);

    // 2. 오래된 임시 파일 정리 (7일 이상)
    await this.cleanupTempFiles(result);
    await job.updateProgress(60);

    // 3. 고아 파일 찾기 및 정리
    await this.cleanupOrphanedFiles(result);
    await job.updateProgress(100);
  }

  /**
   * 실패한 업로드만 정리
   */
  private async cleanupFailedUploads(job: Job, result: FileCleanupResult) {
    await job.updateProgress(10);
    await this.cleanupFailedUploadsInternal(result);
    await job.updateProgress(100);
  }

  /**
   * 실패한 업로드 파일 정리 (내부 메서드)
   */
  private async cleanupFailedUploadsInternal(result: FileCleanupResult) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const failedUploads = await FileUpload.find({
      where: {
        status: FileUploadStatus.FAILED,
        createdAt: LessThan(oneDayAgo),
      },
      take: 100, // 한 번에 100개씩 처리
    });

    for (const upload of failedUploads) {
      try {
        // 스토리지에서 파일 삭제
        if (upload.storageKey) {
          await this.storageService.deleteFile(upload.storageKey);
        }

        // DB 레코드 삭제
        await upload.remove();
        result.processedItems++;
        result.failedUploads++;

        this.logger.debug(`Cleaned up failed upload: ${upload.id}`);
      } catch (error) {
        const errorMsg = `Failed to cleanup upload ${upload.id}: ${error.message}`;
        this.logger.warn(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  }

  /**
   * 오래된 임시 파일 정리
   */
  private async cleanupTempFiles(result: FileCleanupResult) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oldTempUploads = await FileUpload.find({
      where: {
        folder: 'temp',
        createdAt: LessThan(oneWeekAgo),
      },
      take: 100,
    });

    for (const upload of oldTempUploads) {
      try {
        if (upload.storageKey) {
          await this.storageService.deleteFile(upload.storageKey);
        }

        await upload.remove();
        result.processedItems++;
        result.tempFiles++;

        this.logger.debug(`Cleaned up temp file: ${upload.id}`);
      } catch (error) {
        const errorMsg = `Failed to cleanup temp file ${upload.id}: ${error.message}`;
        this.logger.warn(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  }

  /**
   * 고아 파일 정리
   */
  private async cleanupOrphanedFiles(result: FileCleanupResult) {
    try {
      // 고아 파일 찾기 로직
      const orphanedFiles = await this.findOrphanedFiles();

      for (const fileKey of orphanedFiles) {
        try {
          await this.storageService.deleteFile(fileKey);
          result.processedItems++;
          result.orphanedFiles++;

          this.logger.debug(`Cleaned up orphaned file: ${fileKey}`);
        } catch (error) {
          const errorMsg = `Failed to cleanup orphaned file ${fileKey}: ${error.message}`;
          this.logger.warn(errorMsg);
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      this.logger.error('Failed to find orphaned files', error);
    }
  }

  /**
   * 고아 파일 찾기
   */
  private async findOrphanedFiles(): Promise<string[]> {
    // 스토리지에 있지만 DB에 없는 파일들 찾기
    // 이 로직은 스토리지 서비스의 구현에 따라 달라질 수 있음
    try {
      const storageFiles = await this.storageService.listFiles('uploads/');
      const dbFiles = await FileUpload.find({
        select: ['storageKey'],
      });

      const dbFileKeys = new Set(
        dbFiles.map((f) => f.storageKey).filter(Boolean),
      );

      return storageFiles
        .map((f) => f.key)
        .filter((key) => !dbFileKeys.has(key))
        .slice(0, 50); // 한 번에 최대 50개만 처리
    } catch (error) {
      this.logger.error('Error finding orphaned files', error);
      return [];
    }
  }
}
