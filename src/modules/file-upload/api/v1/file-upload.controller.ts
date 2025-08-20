import {
  AfterCreate,
  AfterDestroy,
  BeforeCreate,
  BeforeDestroy,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../../../guards/auth.guard';
import { StorageService } from '../../../storage/storage.service';
import { User } from '../../../user/user.entity';
import { FileUpload } from '../../file-upload.entity';
import { FileUploadStatus } from '../../enums/file-upload-status.enum';
import { FileUploadType } from '../../enums/file-upload-type.enum';
import { FileUploadService } from '../../file-upload.service';
import { PresignedUrlRequestDto } from '../../dto/presigned-url-request.dto';

/**
 * File Upload API Controller (v1)
 *
 * Cloudflare R2 Direct Upload 방식을 사용한 파일 업로드 API
 * - 프론트엔드에서 직접 Cloudflare R2로 업로드
 * - 서버는 Presigned URL 발급 및 업로드 완료 확인만 처리
 * - 최대 500MB 파일 지원
 * - @Crud 패턴으로 일부 라우트 통합
 */
@Controller({ path: 'file-uploads', version: '1' })
@Crud({
  entity: FileUpload,
  only: ['index', 'show', 'create', 'destroy'],
  allowedFilters: [
    'status',
    'userId',
    'mimeType',
    'uploadType',
    'folder',
    'createdAt',
  ],
  allowedParams: [
    'originalFileName',
    'storageKey',
    'mimeType',
    'fileSize',
    'uploadType',
    'folder',
    'publicUrl',
    'metadata',
  ],
  allowedIncludes: ['user'],
  routes: {
    index: {
      allowedFilters: ['status', 'mimeType', 'folder', 'createdAt'],
    },
    show: {
      allowedIncludes: ['user'],
    },
  },
})
@UseGuards(AuthGuard)
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(
    public readonly crudService: FileUploadService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Presigned Upload URL 발급
   * POST /api/v1/file-upload/presigned-url
   *
   * 클라이언트가 직접 Cloudflare R2로 업로드하기 위한 Presigned URL을 발급합니다.
   */
  @Post('presigned-url')
  async getPresignedUploadUrl(
    @Body() body: PresignedUrlRequestDto,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const {
        fileName,
        fileSize,
        mimeType,
        folder = 'files',
        metadata = {},
      } = body;

      // 사용자 정보를 메타데이터에 추가
      const enrichedMetadata = {
        ...metadata,
        uploadedBy: user.id.toString(),
        uploaderName: user.name,
      };

      // Presigned URL 생성
      const presignedUrl = await this.storageService.generatePresignedUploadUrl(
        fileName,
        folder,
        mimeType,
        fileSize,
        enrichedMetadata,
      );

      // 업로드 레코드 생성
      const uploadRecord = await this.crudService.createUploadRecord({
        userId: user.id,
        originalFileName: fileName,
        storageKey: presignedUrl.key,
        mimeType,
        fileSize,
        uploadType: FileUploadType.DIRECT,
        folder,
        metadata: enrichedMetadata,
      });

      this.logger.log(
        `Presigned URL generated for user ${user.id}: ${fileName} (${fileSize} bytes)`,
      );

      return {
        success: true,
        message: 'Presigned URL이 생성되었습니다.',
        data: {
          uploadId: uploadRecord.id,
          uploadUrl: presignedUrl.uploadUrl,
          storageKey: presignedUrl.key,
          publicUrl: presignedUrl.publicUrl,
          expiresAt: presignedUrl.expiresAt,
        },
      };
    } catch (_error) {
      this.logger.error(
        `Presigned URL generation failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 파일 업로드 완료 처리 (create 액션으로 통합)
   * Direct Upload 완료 후 메타데이터 저장
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // Complete upload 로직인 경우
    if (body.storageKey && body.uploadId) {
      // 기존 업로드 레코드 조회
      const existing = await FileUpload.findOne({
        where: { id: body.uploadId, userId: user.id },
      });

      if (!existing) {
        throw new NotFoundException('업로드 레코드를 찾을 수 없습니다.');
      }

      if (existing.status === FileUploadStatus.COMPLETED) {
        // 이미 완료된 경우 업데이트 스킵
        context.skipCreate = true;
        context.existingEntity = existing;
        return null;
      }

      // Cloudflare R2 업로드 확인
      const uploadResult = await this.storageService.verifyUpload(
        body.storageKey,
      );
      if (!uploadResult) {
        throw new BadRequestException('업로드된 파일을 찾을 수 없습니다.');
      }

      // 업데이트용 데이터 준비
      context.isUpdate = true;
      context.updateId = body.uploadId;
      body.status = FileUploadStatus.COMPLETED;
      body.publicUrl = uploadResult.url;
      body.completedAt = new Date();
    } else {
      // 일반 create 로직
      body.userId = user.id;
      body.status = body.status || FileUploadStatus.PENDING;
      body.uploadType = body.uploadType || FileUploadType.DIRECT;
    }

    return body;
  }

  /**
   * 파일 생성/완료 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: FileUpload | null, context: any): Promise<void> {
    if (context.skipCreate && context.existingEntity) {
      // 이미 완료된 경우 기존 엔티티 반환
      return context.existingEntity;
    }

    if (context.isUpdate && entity) {
      // 업로드 완료 이벤트 발행
      this.eventEmitter.emit('file.upload.completed', {
        id: entity.id,
        userId: entity.userId,
        storageKey: entity.storageKey,
        fileName: entity.originalFileName,
      });

      // 이미지 파일인 경우 자동 리사이징 (대용량 이미지 최적화)
      if (entity.mimeType && entity.mimeType.startsWith('image/')) {
        this.startAutoImageOptimization(entity).catch((err) => {
          this.logger.error(
            `이미지 자동 최적화 실패: ${entity.originalFileName}`,
            err.stack,
          );
        });
      }

      this.logger.log(
        `Upload completed: ${entity.originalFileName} for user ${entity.userId}`,
      );
    }
  }

  /**
   * 파일 삭제 전 권한 확인 및 준비
   */
  @BeforeDestroy()
  async beforeDestroy(entity: FileUpload, context: any): Promise<void> {
    const user: User = context.request?.user;

    // 권한 확인
    if (entity.userId !== user.id) {
      throw new ForbiddenException('파일 삭제 권한이 없습니다.');
    }

    // 스토리지 키 저장 (AfterDestroy에서 사용)
    context.storageKey = entity.storageKey;
    context.fileName = entity.originalFileName;

    this.logger.log(
      `Preparing to delete file: ${entity.originalFileName} for user ${user.id}`,
    );
  }

  /**
   * 파일 삭제 후 스토리지 정리
   */
  @AfterDestroy()
  async afterDestroy(entity: FileUpload, context: any): Promise<void> {
    if (context.storageKey) {
      // Cloudflare R2에서 파일 삭제 (비동기)
      this.eventEmitter.emit('file.storage.delete', {
        storageKey: context.storageKey,
        fileName: context.fileName,
      });

      // 실제 삭제는 이벤트 리스너에서 처리
      this.storageService.deleteFile(context.storageKey).catch((err) => {
        this.logger.error(
          `Failed to delete file from storage: ${context.storageKey}`,
          err.stack,
        );
      });

      this.logger.log(
        `File deleted: ${context.fileName} (${context.storageKey})`,
      );
    }
  }

  /**
   * 이미지 자동 최적화
   * 대용량 이미지를 자동으로 리사이징합니다.
   */
  private async startAutoImageOptimization(
    fileUpload: FileUpload,
  ): Promise<void> {
    try {
      // 5MB 이상인 이미지만 최적화
      if (fileUpload.fileSize < 5 * 1024 * 1024) {
        return;
      }

      // 이미지 최적화 이벤트 발행
      this.eventEmitter.emit('image.optimization.start', {
        fileUploadId: fileUpload.id,
        storageKey: fileUpload.storageKey,
        originalSize: fileUpload.fileSize,
        userId: fileUpload.userId,
        metadata: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          format: 'webp', // 자동으로 WebP 변환
        },
      });

      this.logger.log(
        `이미지 자동 최적화 시작: ${fileUpload.originalFileName} (${Math.round(fileUpload.fileSize / 1024 / 1024)}MB)`,
      );
    } catch (_error) {
      this.logger.error(
        `이미지 최적화 이벤트 발행 실패: ${fileUpload.originalFileName}`,
        _error.stack,
      );
    }
  }

  /**
   * 업로드 취소
   * DELETE /api/v1/file-upload/:id/cancel
   *
   * 진행 중인 업로드를 취소합니다.
   */
  @Delete(':id/cancel')
  async cancelUpload(
    @Param('id') id: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const uploadId = parseInt(id);

      // 업로드 레코드 조회
      const uploadRecord = await this.crudService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('업로드 취소 권한이 없습니다.');
      }

      // 이미 완료된 업로드는 취소 불가
      if (uploadRecord.status === FileUploadStatus.COMPLETED) {
        throw new Error('완료된 업로드는 취소할 수 없습니다.');
      }

      // Cloudflare R2에서 파일 삭제 (존재하는 경우)
      if (uploadRecord.storageKey) {
        await this.storageService
          .deleteFile(uploadRecord.storageKey)
          .catch((err) => {
            this.logger.warn(`Failed to delete file from R2: ${err.message}`);
          });
      }

      // 업로드 레코드 상태 업데이트
      const cancelledUpload = await this.crudService.updateStatus(
        uploadId,
        FileUploadStatus.FAILED,
      );

      this.logger.log(
        `Upload cancelled for user ${user.id}: ${cancelledUpload.originalFileName}`,
      );

      return {
        success: true,
        message: '업로드가 취소되었습니다.',
        data: {
          id: cancelledUpload.id,
          status: cancelledUpload.status,
        },
      };
    } catch (_error) {
      this.logger.error(
        `Upload cancellation failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 업로드 완료 확인 (커스텀 엔드포인트)
   * POST /api/v1/file-uploads/complete
   *
   * Direct Upload 완료 후 서버 확인
   */
  @Post('complete')
  async completeUpload(
    @Body() body: { uploadId: number; storageKey: string },
    @Request() _req: any,
  ) {
    const result = await this.crudService.completeUpload(
      body.uploadId,
      body.storageKey,
    );
    return crudResponse(result);
  }

  /**
   * 다운로드 URL 생성
   * GET /api/v1/file-upload/:id/download-url
   *
   * 파일 다운로드를 위한 임시 URL을 생성합니다.
   */
  @Get(':id/download-url')
  async getDownloadUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn: number = 3600,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const uploadId = parseInt(id);

      // 업로드 레코드 조회
      const uploadRecord = await this.crudService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('다운로드 URL 생성 권한이 없습니다.');
      }

      // 완료된 업로드만 다운로드 가능
      if (uploadRecord.status !== FileUploadStatus.COMPLETED) {
        throw new Error('업로드가 완료되지 않은 파일입니다.');
      }

      // 다운로드 URL 생성 (최대 24시간)
      const validExpiresIn = Math.min(Math.max(60, expiresIn), 86400);
      const downloadUrl = await this.storageService.getDownloadUrl(
        uploadRecord.storageKey,
        validExpiresIn,
      );

      this.logger.log(
        `Download URL generated for user ${user.id}: ${uploadRecord.originalFileName}`,
      );

      return {
        success: true,
        message: '다운로드 URL이 생성되었습니다.',
        data: {
          downloadUrl,
          fileName: uploadRecord.originalFileName,
          fileSize: uploadRecord.fileSize,
          expiresIn: validExpiresIn,
          expiresAt: new Date(Date.now() + validExpiresIn * 1000),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Download URL generation failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 스트리밍 URL 조회 (비디오/오디오용)
   * GET /api/v1/file-upload/:id/stream
   *
   * 비디오/오디오 스트리밍을 위한 공개 URL을 반환합니다.
   * Cloudflare R2가 자동으로 HTTP Range 요청을 처리합니다.
   */
  @Get(':id/stream')
  async getStreamingUrl(
    @Param('id') id: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const uploadId = parseInt(id);

      // 업로드 레코드 조회
      const uploadRecord = await this.crudService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('스트리밍 URL 조회 권한이 없습니다.');
      }

      // 완료된 업로드만 스트리밍 가능
      if (uploadRecord.status !== FileUploadStatus.COMPLETED) {
        throw new Error('업로드가 완료되지 않은 파일입니다.');
      }

      // 비디오/오디오 파일인지 확인
      const isMedia =
        uploadRecord.mimeType.startsWith('video/') ||
        uploadRecord.mimeType.startsWith('audio/');

      if (!isMedia) {
        throw new Error('스트리밍은 비디오/오디오 파일만 지원됩니다.');
      }

      // 스트리밍 URL 생성 (공개 URL)
      const streamingUrl = await this.storageService.getStreamingUrl(
        uploadRecord.storageKey,
      );

      this.logger.log(
        `Streaming URL generated for user ${user.id}: ${uploadRecord.originalFileName}`,
      );

      return {
        success: true,
        message: '스트리밍 URL이 생성되었습니다.',
        data: {
          streamingUrl,
          fileName: uploadRecord.originalFileName,
          fileSize: uploadRecord.fileSize,
          mimeType: uploadRecord.mimeType,
          supportedFeatures: {
            httpRange: true,
            seek: true,
            partialContent: true,
          },
          usage: {
            html5Video: `<video src="${streamingUrl}" controls></video>`,
            html5Audio: `<audio src="${streamingUrl}" controls></audio>`,
          },
        },
      };
    } catch (_error) {
      this.logger.error(
        `Streaming URL generation failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }
}
