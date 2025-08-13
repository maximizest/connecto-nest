import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { Repository } from 'typeorm';
import {
  estimateProcessingTime,
  SUPPORTED_VIDEO_FORMATS,
  VIDEO_PROCESSING_CONFIG,
} from '../../config/video-processing.config';
import { StorageService } from '../storage/storage.service';
import {
  VideoProcessing,
  VideoProcessingStatus,
  VideoProcessingType,
  VideoQualityProfile,
} from './video-processing.entity';

interface VideoProcessingJob {
  id: number;
  inputPath: string;
  outputDir: string;
  type: VideoProcessingType;
  quality?: VideoQualityProfile;
  userId: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioChannels?: number;
  audioSampleRate?: number;
  audioCodec?: string;
}

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly processingQueue: Map<number, ffmpeg.FfmpegCommand> =
    new Map();

  constructor(
    @InjectRepository(VideoProcessing)
    private readonly videoProcessingRepository: Repository<VideoProcessing>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 새 비디오 프로세싱 작업 생성
   */
  async createProcessingJob(data: {
    userId: number;
    inputStorageKey: string;
    originalFileName: string;
    inputFileSize: number;
    inputMimeType: string;
    processingType: VideoProcessingType;
    qualityProfile?: VideoQualityProfile;
    fileUploadId?: number;
  }): Promise<VideoProcessing> {
    // 파일 형식 검증
    const extension = data.originalFileName.toLowerCase().split('.').pop();
    if (!extension || !SUPPORTED_VIDEO_FORMATS.includes(extension)) {
      throw new Error(`지원하지 않는 비디오 형식입니다: ${extension}`);
    }

    // 파일 크기 검증
    if (data.inputFileSize > VIDEO_PROCESSING_CONFIG.maxFileSize) {
      throw new Error(
        `파일 크기가 ${VIDEO_PROCESSING_CONFIG.maxFileSize / (1024 * 1024)}MB를 초과합니다.`,
      );
    }

    const job = this.videoProcessingRepository.create({
      ...data,
      status: VideoProcessingStatus.PENDING,
      progress: 0,
      retryCount: 0,
    });

    const savedJob = await this.videoProcessingRepository.save(job);

    this.logger.log(
      `Video processing job created: ${savedJob.id} for user ${data.userId}`,
    );
    return savedJob;
  }

  /**
   * 비디오 메타데이터 추출
   */
  async extractMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          this.logger.error(`FFprobe failed: ${err.message}`);
          reject(new Error(`메타데이터 추출 실패: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video',
        );
        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === 'audio',
        );

        if (!videoStream) {
          reject(new Error('비디오 스트림을 찾을 수 없습니다.'));
          return;
        }

        const result: VideoMetadata = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFps(videoStream.r_frame_rate || '30'),
          bitrate: parseInt(metadata.format.bit_rate?.toString() || '0'),
          codec: videoStream.codec_name || 'unknown',
        };

        if (audioStream) {
          result.audioChannels = audioStream.channels;
          result.audioSampleRate = audioStream.sample_rate;
          result.audioCodec = audioStream.codec_name;
        }

        resolve(result);
      });
    });
  }

  /**
   * 프레임레이트 문자열 파싱
   */
  private parseFps(fpsString: string): number {
    if (fpsString.includes('/')) {
      const [num, den] = fpsString.split('/').map(Number);
      return Math.round(num / den);
    }
    return Math.round(parseFloat(fpsString));
  }

  /**
   * 비디오 압축 처리
   */
  async processVideoCompression(
    jobId: number,
    inputPath: string,
    outputDir: string,
    quality: VideoQualityProfile,
    onProgress?: (progress: number) => void,
  ): Promise<{
    outputPath: string;
    metadata: any;
    fileSize: number;
  }> {
    const job = await this.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    const profile = VIDEO_PROCESSING_CONFIG.qualityProfiles[quality];
    const outputFileName = `compressed_${quality}_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .videoCodec(VIDEO_PROCESSING_CONFIG.videoCodec)
        .audioCodec(VIDEO_PROCESSING_CONFIG.audioCodec)
        .videoBitrate(profile.videoBitrate)
        .audioBitrate(profile.audioBitrate)
        .fps(profile.fps)
        .size(profile.resolution)
        .outputOptions([
          `-preset ${profile.quality}`,
          '-movflags +faststart', // 웹 스트리밍 최적화
          '-profile:v baseline', // 호환성 향상
        ])
        .output(outputPath);

      // 진행률 추적
      command.on('progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        this.logger.debug(`Compression progress for job ${jobId}: ${percent}%`);

        if (onProgress) {
          onProgress(percent);
        }
      });

      command.on('end', async () => {
        try {
          // 출력 파일 크기 확인
          const stats = fs.statSync(outputPath);
          const fileSize = stats.size;

          // 메타데이터 추출
          const metadata = await this.extractMetadata(outputPath);

          this.logger.log(
            `Video compression completed for job ${jobId}: ${outputPath}`,
          );

          resolve({
            outputPath,
            metadata: {
              ...metadata,
              quality,
              fileSize,
            },
            fileSize,
          });
        } catch (error) {
          this.logger.error(
            `Post-processing failed for job ${jobId}: ${error.message}`,
          );
          reject(error);
        }
      });

      command.on('error', (err) => {
        this.logger.error(
          `FFmpeg compression failed for job ${jobId}: ${err.message}`,
        );
        reject(new Error(`비디오 압축 실패: ${err.message}`));
      });

      // 명령어 저장 (취소용)
      this.processingQueue.set(jobId, command);

      // 실행
      command.run();
    });
  }

  /**
   * 썸네일 추출
   */
  async extractThumbnails(
    jobId: number,
    inputPath: string,
    outputDir: string,
    duration: number,
    onProgress?: (progress: number) => void,
  ): Promise<{
    thumbnails: {
      timestamp: number;
      path: string;
      width: number;
      height: number;
      fileSize: number;
    }[];
  }> {
    const config = VIDEO_PROCESSING_CONFIG.thumbnail;
    const thumbnails: any[] = [];

    // 타임스탬프 계산
    const timestamps = config.timestamps.map((timeStr) => {
      const percent = parseInt(timeStr.replace('%', ''));
      return Math.floor((duration * percent) / 100);
    });

    let completed = 0;
    const total = timestamps.length;

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const thumbnailPath = path.join(
        outputDir,
        `thumbnail_${timestamp}s_${Date.now()}_${i}.${config.format}`,
      );

      try {
        await this.extractSingleThumbnail(
          inputPath,
          thumbnailPath,
          timestamp,
          config.resolution,
        );

        // Sharp로 최적화
        const optimizedBuffer = await sharp(thumbnailPath)
          .resize(320, 180, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: config.quality })
          .toBuffer();

        fs.writeFileSync(thumbnailPath, optimizedBuffer);

        const stats = fs.statSync(thumbnailPath);
        thumbnails.push({
          timestamp,
          path: thumbnailPath,
          width: 320,
          height: 180,
          fileSize: stats.size,
        });

        completed++;
        const progress = Math.round((completed / total) * 100);

        if (onProgress) {
          onProgress(progress);
        }

        this.logger.debug(
          `Thumbnail extracted for job ${jobId}: ${timestamp}s`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to extract thumbnail at ${timestamp}s for job ${jobId}: ${error.message}`,
        );
      }
    }

    return { thumbnails };
  }

  /**
   * 단일 썸네일 추출
   */
  private extractSingleThumbnail(
    inputPath: string,
    outputPath: string,
    timestamp: number,
    resolution: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: resolution,
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  /**
   * 전체 프로세싱 실행
   */
  async processVideo(jobId: number): Promise<VideoProcessing> {
    const job = await this.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }

    try {
      // 프로세싱 시작
      job.startProcessing();
      await this.videoProcessingRepository.save(job);

      // 임시 디렉토리 생성
      const tempDir = path.join(
        VIDEO_PROCESSING_CONFIG.processing.tempDirectory,
        `job_${jobId}_${Date.now()}`,
      );
      fs.mkdirSync(tempDir, { recursive: true });

      // 입력 파일 다운로드
      const inputPath = await this.downloadInputFile(
        job.inputStorageKey,
        tempDir,
      );

      // 메타데이터 추출
      const inputMetadata = await this.extractMetadata(inputPath);
      job.inputMetadata = inputMetadata;

      // 예상 처리 시간 계산
      if (job.qualityProfile) {
        job.estimatedDurationSeconds =
          estimateProcessingTime(
            job.inputFileSize / (1024 * 1024),
            inputMetadata.duration,
            job.qualityProfile,
          ) * 60; // 분을 초로 변환
      }

      await this.videoProcessingRepository.save(job);

      const results: any = {
        storageKeys: [],
        urls: [],
        totalSize: 0,
        metadata: {},
        thumbnails: [],
      };

      // 타입별 프로세싱
      switch (job.processingType) {
        case VideoProcessingType.COMPRESSION:
          if (job.qualityProfile) {
            const compressionResult = await this.processVideoCompression(
              jobId,
              inputPath,
              tempDir,
              job.qualityProfile,
              (progress) => {
                job.updateProgress(progress, `압축 진행중: ${progress}%`);
                this.videoProcessingRepository.save(job);
              },
            );

            // 압축된 파일 업로드
            const uploadResult = await this.uploadOutputFile(
              compressionResult.outputPath,
              `compressed_${job.qualityProfile}`,
            );

            results.storageKeys.push(uploadResult.key);
            results.urls.push(uploadResult.url);
            results.totalSize += compressionResult.fileSize;
            results.metadata[job.qualityProfile] = {
              ...compressionResult.metadata,
              storageKey: uploadResult.key,
              publicUrl: uploadResult.url,
            };
          }
          break;

        case VideoProcessingType.THUMBNAIL:
          const thumbnailResult = await this.extractThumbnails(
            jobId,
            inputPath,
            tempDir,
            inputMetadata.duration,
            (progress) => {
              job.updateProgress(progress, `썸네일 추출 진행중: ${progress}%`);
              this.videoProcessingRepository.save(job);
            },
          );

          // 썸네일들 업로드
          for (const thumb of thumbnailResult.thumbnails) {
            const uploadResult = await this.uploadOutputFile(
              thumb.path,
              'thumbnails',
            );

            results.thumbnails.push({
              timestamp: thumb.timestamp,
              storageKey: uploadResult.key,
              publicUrl: uploadResult.url,
              width: thumb.width,
              height: thumb.height,
              fileSize: thumb.fileSize,
            });

            results.storageKeys.push(uploadResult.key);
            results.urls.push(uploadResult.url);
            results.totalSize += thumb.fileSize;
          }
          break;

        case VideoProcessingType.FULL_PROCESSING:
          // 압축 + 썸네일 모두 처리
          if (job.qualityProfile) {
            // 1. 압축 처리 (60% 진행률까지)
            const compressionResult = await this.processVideoCompression(
              jobId,
              inputPath,
              tempDir,
              job.qualityProfile,
              (progress) => {
                const adjustedProgress = Math.round(progress * 0.6);
                job.updateProgress(
                  adjustedProgress,
                  `압축 진행중: ${progress}%`,
                );
                this.videoProcessingRepository.save(job);
              },
            );

            const uploadResult = await this.uploadOutputFile(
              compressionResult.outputPath,
              `compressed_${job.qualityProfile}`,
            );

            results.storageKeys.push(uploadResult.key);
            results.urls.push(uploadResult.url);
            results.totalSize += compressionResult.fileSize;
            results.metadata[job.qualityProfile] = {
              ...compressionResult.metadata,
              storageKey: uploadResult.key,
              publicUrl: uploadResult.url,
            };

            // 2. 썸네일 추출 (60%~100% 진행률)
            const thumbnailResult = await this.extractThumbnails(
              jobId,
              inputPath,
              tempDir,
              inputMetadata.duration,
              (progress) => {
                const adjustedProgress = Math.round(60 + progress * 0.4);
                job.updateProgress(
                  adjustedProgress,
                  `썸네일 추출 진행중: ${progress}%`,
                );
                this.videoProcessingRepository.save(job);
              },
            );

            // 썸네일들 업로드
            for (const thumb of thumbnailResult.thumbnails) {
              const thumbUploadResult = await this.uploadOutputFile(
                thumb.path,
                'thumbnails',
              );

              results.thumbnails.push({
                timestamp: thumb.timestamp,
                storageKey: thumbUploadResult.key,
                publicUrl: thumbUploadResult.url,
                width: thumb.width,
                height: thumb.height,
                fileSize: thumb.fileSize,
              });

              results.storageKeys.push(thumbUploadResult.key);
              results.urls.push(thumbUploadResult.url);
              results.totalSize += thumb.fileSize;
            }
          }
          break;
      }

      // 프로세싱 완료
      job.completeProcessing(results);
      await this.videoProcessingRepository.save(job);

      // 임시 파일 정리
      this.cleanupTempDirectory(tempDir);

      // 큐에서 제거
      this.processingQueue.delete(jobId);

      this.logger.log(`Video processing completed for job ${jobId}`);
      return job;
    } catch (error) {
      // 프로세싱 실패
      job.failProcessing(error.message, [error.stack]);
      await this.videoProcessingRepository.save(job);

      // 큐에서 제거
      this.processingQueue.delete(jobId);

      this.logger.error(
        `Video processing failed for job ${jobId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 입력 파일 다운로드
   */
  private async downloadInputFile(
    storageKey: string,
    tempDir: string,
  ): Promise<string> {
    // StorageService를 통해 파일 다운로드 URL 생성
    const downloadUrl = await this.storageService.getDownloadUrl(
      storageKey,
      3600,
    );

    // 실제 구현에서는 HTTP 요청으로 파일을 다운로드해야 함
    // 여기서는 간단히 로컬 경로로 가정
    const inputPath = path.join(tempDir, `input_${Date.now()}`);

    // TODO: 실제 다운로드 로직 구현
    // const response = await fetch(downloadUrl);
    // const buffer = await response.buffer();
    // fs.writeFileSync(inputPath, buffer);

    return inputPath;
  }

  /**
   * 출력 파일 업로드
   */
  private async uploadOutputFile(
    filePath: string,
    folder: 'thumbnails' | 'videos' | string,
  ): Promise<{ key: string; url: string; size: number }> {
    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Multer.File 형태로 변환
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: this.getMimeType(fileName),
      size: stats.size,
      buffer,
      destination: '',
      filename: fileName,
      path: filePath,
      stream: null as any,
    };

    const result = await this.storageService.uploadFile(file, folder as any, {
      'processing-output': 'true',
      'upload-date': new Date().toISOString(),
    });

    return result;
  }

  /**
   * 파일 확장자로부터 MIME 타입 추정
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();

    const mimeTypes: { [key: string]: string } = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * 임시 디렉토리 정리
   */
  private cleanupTempDirectory(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        this.logger.debug(`Cleaned up temp directory: ${tempDir}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup temp directory ${tempDir}: ${error.message}`,
      );
    }
  }

  /**
   * 프로세싱 작업 조회
   */
  async findById(id: number): Promise<VideoProcessing | null> {
    return await this.videoProcessingRepository.findOne({
      where: { id },
      relations: ['user', 'fileUpload'],
    });
  }

  /**
   * 사용자별 프로세싱 작업 목록 조회
   */
  async findByUser(
    userId: number,
    options?: {
      status?: VideoProcessingStatus;
      processingType?: VideoProcessingType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ jobs: VideoProcessing[]; total: number }> {
    const queryBuilder = this.videoProcessingRepository
      .createQueryBuilder('processing')
      .leftJoinAndSelect('processing.user', 'user')
      .leftJoinAndSelect('processing.fileUpload', 'fileUpload')
      .where('processing.userId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('processing.status = :status', {
        status: options.status,
      });
    }

    if (options?.processingType) {
      queryBuilder.andWhere('processing.processingType = :processingType', {
        processingType: options.processingType,
      });
    }

    queryBuilder.orderBy('processing.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return { jobs, total };
  }

  /**
   * 프로세싱 작업 취소
   */
  async cancelProcessing(id: number): Promise<VideoProcessing> {
    const job = await this.findById(id);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${id}`);
    }

    // FFmpeg 명령어 중단
    const command = this.processingQueue.get(id);
    if (command) {
      command.kill('SIGKILL');
      this.processingQueue.delete(id);
      this.logger.log(`FFmpeg process killed for job ${id}`);
    }

    // 상태 업데이트
    job.cancelProcessing();
    const updatedJob = await this.videoProcessingRepository.save(job);

    this.logger.log(`Video processing cancelled for job ${id}`);
    return updatedJob;
  }

  /**
   * 실패한 작업 재시도
   */
  async retryProcessing(id: number): Promise<VideoProcessing> {
    const job = await this.findById(id);
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${id}`);
    }

    if (!job.canRetry()) {
      throw new Error(
        'Job cannot be retried (max retries reached or wrong status)',
      );
    }

    // 상태 초기화
    job.status = VideoProcessingStatus.PENDING;
    job.progress = 0;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.errorMessage = undefined;
    job.outputStorageKeys = undefined;
    job.outputTotalSize = undefined;
    job.outputUrls = undefined;
    job.outputMetadata = undefined;
    job.thumbnails = undefined;
    job.processingLogs = undefined;

    const updatedJob = await this.videoProcessingRepository.save(job);

    this.logger.log(`Video processing retry initiated for job ${id}`);
    return updatedJob;
  }

  /**
   * 오래된 임시 파일 정리
   */
  async cleanupOldTempFiles(): Promise<number> {
    const tempDir = VIDEO_PROCESSING_CONFIG.processing.tempDirectory;
    const maxAge =
      VIDEO_PROCESSING_CONFIG.processing.cleanupAfterHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    try {
      if (!fs.existsSync(tempDir)) {
        return cleanedCount;
      }

      const files = fs.readdirSync(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);

        if (Date.now() - stats.mtime.getTime() > maxAge) {
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          cleanedCount++;
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} old temp files`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old temp files: ${error.message}`);
    }

    return cleanedCount;
  }
}
