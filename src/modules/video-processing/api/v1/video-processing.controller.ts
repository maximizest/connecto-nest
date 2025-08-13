import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { FileUploadService } from '../../../file-upload/file-upload.service';
import { User } from '../../../user/user.entity';
import {
  VideoProcessingStatus,
  VideoProcessingType,
  VideoQualityProfile,
} from '../../video-processing.entity';
import { VideoProcessingService } from '../../video-processing.service';

interface VideoProcessingRequest {
  fileUploadId?: number;
  inputStorageKey: string;
  originalFileName?: string;
  processingType: VideoProcessingType;
  qualityProfile?: VideoQualityProfile;
}

/**
 * Video Processing API Controller (v1)
 *
 * 비디오 프로세싱을 위한 API를 제공합니다.
 * - 비디오 압축 (다양한 품질)
 * - 썸네일 추출
 * - 메타데이터 추출
 * - 진행률 실시간 추적
 */
@Controller({ path: 'video-processing', version: '1' })
@UseGuards(AuthGuard)
export class VideoProcessingController {
  private readonly logger = new Logger(VideoProcessingController.name);

  constructor(
    private readonly videoProcessingService: VideoProcessingService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  /**
   * 비디오 프로세싱 작업 시작
   * POST /api/v1/video-processing/process
   */
  @Post('process')
  async startVideoProcessing(
    @Body() body: VideoProcessingRequest,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      // 파일 업로드 정보 조회 (선택적)
      let inputFileSize = 0;
      let inputMimeType = 'video/mp4';
      let originalFileName = body.originalFileName || 'video.mp4';

      if (body.fileUploadId) {
        const fileUpload = await this.fileUploadService.findById(
          body.fileUploadId,
        );
        if (!fileUpload) {
          throw new NotFoundException(
            `File upload not found: ${body.fileUploadId}`,
          );
        }

        // 사용자 권한 확인
        if (fileUpload.userId !== user.id) {
          throw new Error('파일 접근 권한이 없습니다.');
        }

        inputFileSize = fileUpload.fileSize;
        inputMimeType = fileUpload.mimeType;
        originalFileName = fileUpload.originalFileName;
      }

      // 프로세싱 타입 검증
      if (
        body.processingType === VideoProcessingType.COMPRESSION &&
        !body.qualityProfile
      ) {
        throw new Error('압축 작업에는 품질 프로필이 필요합니다.');
      }

      // 프로세싱 작업 생성
      const processingJob =
        await this.videoProcessingService.createProcessingJob({
          userId: user.id,
          inputStorageKey: body.inputStorageKey,
          originalFileName,
          inputFileSize,
          inputMimeType,
          processingType: body.processingType,
          qualityProfile: body.qualityProfile,
          fileUploadId: body.fileUploadId,
        });

      this.logger.log(
        `Video processing started: ${processingJob.id}, user: ${user.id}`,
      );

      // 비동기로 프로세싱 시작 (백그라운드에서 실행)
      this.videoProcessingService
        .processVideo(processingJob.id)
        .then(() => {
          this.logger.log(`Video processing completed: ${processingJob.id}`);
        })
        .catch((error) => {
          this.logger.error(
            `Video processing failed: ${processingJob.id} - ${error.message}`,
          );
        });

      return {
        success: true,
        message: '비디오 프로세싱이 시작되었습니다.',
        data: {
          jobId: processingJob.id,
          status: processingJob.status,
          processingType: processingJob.processingType,
          qualityProfile: processingJob.qualityProfile,
          originalFileName: processingJob.originalFileName,
          inputFileSize: processingJob.inputFileSize,
          estimatedDuration: processingJob.estimatedDurationSeconds,
          createdAt: processingJob.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Video processing start failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 비디오 압축 작업 시작 (단축 API)
   * POST /api/v1/video-processing/compress
   */
  @Post('compress')
  async compressVideo(
    @Body('inputStorageKey') inputStorageKey: string,
    @Body('qualityProfile') qualityProfile: VideoQualityProfile,
    @Body('fileUploadId') fileUploadId?: number,
    @Request() req?: any,
  ) {
    return await this.startVideoProcessing(
      {
        inputStorageKey,
        processingType: VideoProcessingType.COMPRESSION,
        qualityProfile,
        fileUploadId,
      },
      req,
    );
  }

  /**
   * 썸네일 추출 작업 시작 (단축 API)
   * POST /api/v1/video-processing/thumbnails
   */
  @Post('thumbnails')
  async extractThumbnails(
    @Body('inputStorageKey') inputStorageKey: string,
    @Body('fileUploadId') fileUploadId?: number,
    @Request() req?: any,
  ) {
    return await this.startVideoProcessing(
      {
        inputStorageKey,
        processingType: VideoProcessingType.THUMBNAIL,
        fileUploadId,
      },
      req,
    );
  }

  /**
   * 전체 프로세싱 작업 시작 (압축 + 썸네일)
   * POST /api/v1/video-processing/full
   */
  @Post('full')
  async fullProcessing(
    @Body('inputStorageKey') inputStorageKey: string,
    @Body('qualityProfile') qualityProfile: VideoQualityProfile,
    @Body('fileUploadId') fileUploadId?: number,
    @Request() req?: any,
  ) {
    return await this.startVideoProcessing(
      {
        inputStorageKey,
        processingType: VideoProcessingType.FULL_PROCESSING,
        qualityProfile,
        fileUploadId,
      },
      req,
    );
  }

  /**
   * 프로세싱 진행 상황 조회
   * GET /api/v1/video-processing/progress/:jobId
   */
  @Get('progress/:jobId')
  async getProcessingProgress(
    @Param('jobId') jobId: string,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      const job = await this.videoProcessingService.findById(parseInt(jobId));
      if (!job) {
        throw new NotFoundException(`Processing job not found: ${jobId}`);
      }

      // 사용자 권한 확인
      if (job.userId !== user.id) {
        throw new Error('프로세싱 작업 조회 권한이 없습니다.');
      }

      return {
        success: true,
        message: '프로세싱 진행 상황을 가져왔습니다.',
        data: {
          ...job.getSummary(),
          inputMetadata: job.inputMetadata,
          outputMetadata: job.outputMetadata,
          thumbnails: job.thumbnails,
          outputUrls: job.getOutputUrls(),
          processingLogs: job.processingLogs?.slice(-10), // 최근 10개 로그만
        },
      };
    } catch (error) {
      this.logger.error(
        `Processing progress retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 프로세싱 작업 상세 정보 조회
   * GET /api/v1/video-processing/:jobId
   */
  @Get(':jobId')
  async getProcessingJob(@Param('jobId') jobId: string, @Request() req?: any) {
    const user: User = req.user;

    try {
      const job = await this.videoProcessingService.findById(parseInt(jobId));
      if (!job) {
        throw new NotFoundException(`Processing job not found: ${jobId}`);
      }

      // 사용자 권한 확인
      if (job.userId !== user.id) {
        throw new Error('프로세싱 작업 조회 권한이 없습니다.');
      }

      return {
        success: true,
        message: '프로세싱 작업 정보를 가져왔습니다.',
        data: {
          id: job.id,
          status: job.status,
          processingType: job.processingType,
          qualityProfile: job.qualityProfile,
          originalFileName: job.originalFileName,
          inputFileSize: job.inputFileSize,
          outputTotalSize: job.outputTotalSize,
          progress: job.progress,
          compressionRatio: job.getCompressionRatio(),
          processingDuration: job.getProcessingDuration(),
          estimatedDuration: job.estimatedDurationSeconds,
          timeAccuracy: job.getTimeAccuracy(),
          inputMetadata: job.inputMetadata,
          outputMetadata: job.outputMetadata,
          thumbnails: job.thumbnails,
          outputUrls: job.getOutputUrls(),
          outputStorageKeys: job.getOutputStorageKeys(),
          errorMessage: job.errorMessage,
          retryCount: job.retryCount,
          canRetry: job.canRetry(),
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Processing job retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자 프로세싱 작업 목록 조회
   * GET /api/v1/video-processing/my/jobs
   */
  @Get('my/jobs')
  async getMyProcessingJobs(
    @Query('status') status?: VideoProcessingStatus,
    @Query('processingType') processingType?: VideoProcessingType,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req?: any,
  ) {
    const user: User = req.user;

    try {
      const validatedLimit = Math.min(Math.max(1, limit), 100);
      const offset = (page - 1) * validatedLimit;

      const result = await this.videoProcessingService.findByUser(user.id, {
        status,
        processingType,
        limit: validatedLimit,
        offset,
      });

      return {
        success: true,
        message: '프로세싱 작업 목록을 가져왔습니다.',
        data: {
          jobs: result.jobs.map((job) => ({
            ...job.getSummary(),
            thumbnailUrls: job.getThumbnailUrls(),
            outputUrls: job.getOutputUrls(),
          })),
          pagination: {
            total: result.total,
            page,
            limit: validatedLimit,
            totalPages: Math.ceil(result.total / validatedLimit),
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `Processing job list retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 프로세싱 작업 취소
   * DELETE /api/v1/video-processing/:jobId/cancel
   */
  @Delete(':jobId/cancel')
  async cancelProcessing(@Param('jobId') jobId: string, @Request() req?: any) {
    const user: User = req.user;

    try {
      const job = await this.videoProcessingService.findById(parseInt(jobId));
      if (!job) {
        throw new NotFoundException(`Processing job not found: ${jobId}`);
      }

      // 사용자 권한 확인
      if (job.userId !== user.id) {
        throw new Error('프로세싱 작업 취소 권한이 없습니다.');
      }

      // 취소 가능 상태 확인
      if (job.status === VideoProcessingStatus.COMPLETED) {
        throw new Error('이미 완료된 작업은 취소할 수 없습니다.');
      }

      if (job.status === VideoProcessingStatus.CANCELLED) {
        throw new Error('이미 취소된 작업입니다.');
      }

      const cancelledJob = await this.videoProcessingService.cancelProcessing(
        parseInt(jobId),
      );

      this.logger.log(`Video processing cancelled: ${jobId}, user: ${user.id}`);

      return {
        success: true,
        message: '프로세싱 작업이 취소되었습니다.',
        data: {
          jobId: cancelledJob.id,
          status: cancelledJob.status,
          cancelledAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Processing cancellation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 실패한 프로세싱 작업 재시도
   * POST /api/v1/video-processing/:jobId/retry
   */
  @Post(':jobId/retry')
  async retryProcessing(@Param('jobId') jobId: string, @Request() req?: any) {
    const user: User = req.user;

    try {
      const job = await this.videoProcessingService.findById(parseInt(jobId));
      if (!job) {
        throw new NotFoundException(`Processing job not found: ${jobId}`);
      }

      // 사용자 권한 확인
      if (job.userId !== user.id) {
        throw new Error('프로세싱 작업 재시도 권한이 없습니다.');
      }

      if (!job.canRetry()) {
        throw new Error(
          '재시도할 수 없는 작업입니다. (최대 재시도 횟수 초과 또는 잘못된 상태)',
        );
      }

      const retriedJob = await this.videoProcessingService.retryProcessing(
        parseInt(jobId),
      );

      // 비동기로 프로세싱 재시작
      this.videoProcessingService
        .processVideo(retriedJob.id)
        .then(() => {
          this.logger.log(`Video processing retry completed: ${retriedJob.id}`);
        })
        .catch((error) => {
          this.logger.error(
            `Video processing retry failed: ${retriedJob.id} - ${error.message}`,
          );
        });

      this.logger.log(`Video processing retried: ${jobId}, user: ${user.id}`);

      return {
        success: true,
        message: '프로세싱 작업이 재시도되었습니다.',
        data: {
          jobId: retriedJob.id,
          status: retriedJob.status,
          retryCount: retriedJob.retryCount,
          retriedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Processing retry failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 지원되는 품질 프로필 목록 조회
   * GET /api/v1/video-processing/quality-profiles
   */
  @Get('quality-profiles')
  async getQualityProfiles() {
    const { VIDEO_PROCESSING_CONFIG } = await import(
      '../../../../config/video-processing.config'
    );
    const { qualityProfiles } = VIDEO_PROCESSING_CONFIG;

    const profiles = Object.entries(qualityProfiles).map(([key, profile]) => {
      const typedProfile = profile as {
        resolution: string;
        videoBitrate: string;
        audioBitrate: string;
        fps: number;
        quality: string;
      };

      return {
        name: key,
        displayName: this.getQualityDisplayName(key as VideoQualityProfile),
        resolution: typedProfile.resolution,
        videoBitrate: typedProfile.videoBitrate,
        audioBitrate: typedProfile.audioBitrate,
        fps: typedProfile.fps,
        quality: typedProfile.quality,
        description: this.getQualityDescription(key as VideoQualityProfile),
      };
    });

    return {
      success: true,
      message: '지원되는 품질 프로필 목록을 가져왔습니다.',
      data: {
        profiles,
        defaultProfile: VideoQualityProfile.MEDIUM,
      },
    };
  }

  /**
   * 품질 프로필 표시명
   */
  private getQualityDisplayName(quality: VideoQualityProfile): string {
    const displayNames = {
      [VideoQualityProfile.LOW]: '낮음 (모바일 최적화)',
      [VideoQualityProfile.MEDIUM]: '보통 (일반 용도)',
      [VideoQualityProfile.HIGH]: '높음 (고화질)',
      [VideoQualityProfile.ULTRA]: '최고 (Full HD)',
    };

    return displayNames[quality];
  }

  /**
   * 품질 프로필 설명
   */
  private getQualityDescription(quality: VideoQualityProfile): string {
    const descriptions = {
      [VideoQualityProfile.LOW]:
        '파일 크기가 작고 모바일 환경에 최적화된 품질입니다.',
      [VideoQualityProfile.MEDIUM]:
        '파일 크기와 화질의 균형이 잘 맞는 일반적인 품질입니다.',
      [VideoQualityProfile.HIGH]:
        '고화질 영상으로 데스크톱 환경에 적합한 품질입니다.',
      [VideoQualityProfile.ULTRA]:
        '최고 화질의 Full HD 영상으로 프리미엄 콘텐츠에 적합합니다.',
    };

    return descriptions[quality];
  }

  /**
   * 파일 크기 예상 계산
   * POST /api/v1/video-processing/estimate-size
   */
  @Post('estimate-size')
  async estimateOutputSize(
    @Body('inputSizeMB') inputSizeMB: number,
    @Body('durationSeconds') durationSeconds: number,
    @Body('qualityProfile') qualityProfile: VideoQualityProfile,
  ) {
    try {
      const { estimateOutputSize } = await import(
        '../../../../config/video-processing.config'
      );

      const estimatedSizeMB = estimateOutputSize(
        inputSizeMB,
        durationSeconds,
        qualityProfile,
      );

      const { estimateProcessingTime } = await import(
        '../../../../config/video-processing.config'
      );

      const estimatedTimeMinutes = estimateProcessingTime(
        inputSizeMB,
        durationSeconds,
        qualityProfile,
      );

      const compressionRatio = Math.round(
        (1 - estimatedSizeMB / inputSizeMB) * 100,
      );

      return {
        success: true,
        message: '파일 크기 및 처리 시간이 예상되었습니다.',
        data: {
          inputSizeMB,
          estimatedOutputSizeMB: estimatedSizeMB,
          estimatedProcessingTimeMinutes: estimatedTimeMinutes,
          estimatedCompressionRatio: Math.max(0, compressionRatio),
          qualityProfile,
          durationSeconds,
        },
      };
    } catch (error) {
      this.logger.error(
        `Size estimation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
