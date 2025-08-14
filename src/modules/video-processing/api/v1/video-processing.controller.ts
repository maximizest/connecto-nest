import {
  AfterCreate,
  AfterUpdate,
  BeforeCreate,
  BeforeIndex,
  BeforeShow,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { FileUploadService } from '../../../file-upload/file-upload.service';
import { User } from '../../../user/user.entity';
import {
  VideoProcessing,
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
 * - @Crud 패턴으로 일부 라우트 통합
 */
@Controller({ path: 'video-processing', version: '1' })
@Crud({
  entity: VideoProcessing,
  only: ['index', 'show', 'create', 'update'],
  allowedFilters: [
    'userId',
    'status',
    'processingType',
    'qualityProfile',
    'createdAt',
  ],
  allowedParams: [
    'inputStorageKey',
    'originalFileName',
    'inputFileSize',
    'inputMimeType',
    'processingType',
    'qualityProfile',
    'fileUploadId',
  ],
  allowedIncludes: ['user', 'fileUpload'],
  routes: {
    index: {
      allowedFilters: ['status', 'processingType', 'qualityProfile'],
    },
    show: {
      allowedIncludes: ['user', 'fileUpload'],
    },
  },
})
@UseGuards(AuthGuard)
export class VideoProcessingController {
  private readonly logger = new Logger(VideoProcessingController.name);

  constructor(
    public readonly crudService: VideoProcessingService,
    @InjectRepository(VideoProcessing)
    private readonly videoProcessingRepository: Repository<VideoProcessing>,
    private readonly fileUploadService: FileUploadService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 목록 조회 전 필터 처리
   * 사용자는 자신의 작업만 조회 가능
   */
  @BeforeIndex()
  async beforeIndex(query: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    
    // 사용자 필터 강제 적용
    query.filters = query.filters || {};
    query.filters.userId = user.id;
    
    this.logger.log(`Filtering video processing jobs for user ${user.id}`);
    return query;
  }

  /**
   * 단일 조회 전 권한 확인
   */
  @BeforeShow()
  async beforeShow(entity: VideoProcessing, context: any): Promise<VideoProcessing> {
    const user: User = context.request?.user;
    
    if (entity.userId !== user.id) {
      throw new ForbiddenException('작업 조회 권한이 없습니다.');
    }
    
    return entity;
  }

  /**
   * 프로세싱 작업 생성 전 처리
   * 파일 검증 및 데이터 준비
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    
    // 파일 업로드 정보 조회
    if (body.fileUploadId) {
      const fileUpload = await this.fileUploadService.findById(body.fileUploadId);
      if (!fileUpload) {
        throw new NotFoundException(`File upload not found: ${body.fileUploadId}`);
      }
      
      // 권한 확인
      if (fileUpload.userId !== user.id) {
        throw new ForbiddenException('파일 접근 권한이 없습니다.');
      }
      
      // 메타데이터 추가
      body.inputFileSize = fileUpload.fileSize;
      body.inputMimeType = fileUpload.mimeType;
      body.originalFileName = fileUpload.originalFileName;
      body.inputStorageKey = fileUpload.storageKey;
    }
    
    // 프로세싱 타입 검증
    if (body.processingType === VideoProcessingType.COMPRESSION && !body.qualityProfile) {
      throw new BadRequestException('압축 작업에는 품질 프로필이 필요합니다.');
    }
    
    // 기본값 설정
    body.userId = user.id;
    body.status = VideoProcessingStatus.PENDING;
    body.progress = 0;
    body.retryCount = 0;
    
    return body;
  }

  /**
   * 프로세싱 작업 생성 후 처리
   * 비동기 프로세싱 시작
   */
  @AfterCreate()
  async afterCreate(entity: VideoProcessing, context: any): Promise<void> {
    // 비동기 프로세싱 시작 이벤트 발행
    this.eventEmitter.emit('video.processing.start', {
      jobId: entity.id,
      type: entity.processingType,
      quality: entity.qualityProfile,
      userId: entity.userId,
    });
    
    // 실제 FFmpeg 프로세싱은 이벤트 리스너에서 처리
    this.crudService.processVideo(entity.id)
      .then(() => {
        this.logger.log(`Video processing completed: ${entity.id}`);
      })
      .catch((error) => {
        this.logger.error(
          `Video processing failed: ${entity.id} - ${error.message}`,
        );
      });
    
    this.logger.log(
      `Video processing job created: ${entity.id} for user ${entity.userId}`
    );
  }

  /**
   * 작업 업데이트 전 처리
   * 취소/재시도 로직 처리
   */
  @BeforeUpdate()
  async beforeUpdate(entity: VideoProcessing, body: any, context: any): Promise<any> {
    const user: User = context.request?.user;
    
    // 권한 확인
    if (entity.userId !== user.id) {
      throw new ForbiddenException('작업 수정 권한이 없습니다.');
    }
    
    // 취소 요청
    if (body.status === VideoProcessingStatus.CANCELLED) {
      if (entity.status !== VideoProcessingStatus.PROCESSING) {
        throw new BadRequestException('진행 중인 작업만 취소할 수 있습니다.');
      }
      context.isCancellation = true;
    }
    
    // 재시도 요청
    if (body.retry === true) {
      if (!entity.canRetry()) {
        throw new BadRequestException('최대 재시도 횟수를 초과했습니다.');
      }
      
      body.status = VideoProcessingStatus.PENDING;
      body.progress = 0;
      body.retryCount = entity.retryCount + 1;
      body.startedAt = null;
      body.completedAt = null;
      body.errorMessage = null;
      context.isRetry = true;
    }
    
    return body;
  }

  /**
   * 작업 업데이트 후 처리
   */
  @AfterUpdate()
  async afterUpdate(entity: VideoProcessing, context: any): Promise<void> {
    // 취소 처리
    if (context.isCancellation) {
      this.eventEmitter.emit('video.processing.cancel', {
        jobId: entity.id,
        userId: entity.userId,
      });
      
      this.logger.log(`Video processing cancelled: ${entity.id}`);
    }
    
    // 재시도 처리
    if (context.isRetry) {
      this.eventEmitter.emit('video.processing.retry', {
        jobId: entity.id,
        retryCount: entity.retryCount,
        userId: entity.userId,
      });
      
      // 다시 프로세싱 시작
      this.crudService.processVideo(entity.id);
      
      this.logger.log(`Video processing retry: ${entity.id} (attempt ${entity.retryCount})`);
    }
  }

  /**
   * 작업 취소 (커스텀 엔드포인트)
   * PATCH /api/v1/video-processing/:id/cancel
   */
  @Patch(':id/cancel')
  async cancelProcessing(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const jobId = parseInt(id);
    const job = await this.crudService.findById(jobId);
    
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }
    
    // update 액션으로 위임
    const updated = await this.crudService.update(jobId, {
      status: VideoProcessingStatus.CANCELLED,
    });
    
    return crudResponse(updated);
  }

  /**
   * 작업 재시도 (커스텀 엔드포인트)
   * PATCH /api/v1/video-processing/:id/retry
   */
  @Patch(':id/retry')
  async retryProcessing(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const jobId = parseInt(id);
    const job = await this.crudService.findById(jobId);
    
    if (!job) {
      throw new NotFoundException(`Processing job not found: ${jobId}`);
    }
    
    // update 액션으로 위임
    const updated = await this.crudService.update(jobId, {
      retry: true,
    });
    
    return crudResponse(updated);
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
