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
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { STORAGE_SETTINGS } from '../../../../config/storage.config';
import { AuthGuard } from '../../../../guards/auth.guard';
import { StorageService } from '../../../storage/storage.service';
import { User } from '../../../user/user.entity';
import {
  FileUpload,
  FileUploadStatus,
  FileUploadType,
} from '../../file-upload.entity';
import { FileUploadService } from '../../file-upload.service';

interface PresignedUrlRequestDto {
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder?: keyof typeof STORAGE_SETTINGS.folders;
  metadata?: Record<string, string>;
}

interface CompleteUploadDto {
  uploadId: number;
  storageKey: string;
}

/**
 * File Upload API Controller (v1)
 *
 * Cloudflare R2 Direct Upload 방식을 사용한 파일 업로드 API
 * - 프론트엔드에서 직접 Cloudflare R2로 업로드
 * - 서버는 Presigned URL 발급 및 업로드 완료 확인만 처리
 * - 최대 500MB 파일 지원
 */
@Controller({ path: 'file-upload', version: '1' })
@UseGuards(AuthGuard)
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly storageService: StorageService,
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
      const { fileName, fileSize, mimeType, folder = 'files', metadata = {} } = body;

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
      const uploadRecord = await this.fileUploadService.createUploadRecord({
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
    } catch (error) {
      this.logger.error(`Presigned URL generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 업로드 완료 확인
   * POST /api/v1/file-upload/complete
   * 
   * 클라이언트가 Cloudflare R2로 직접 업로드를 완료한 후,
   * 서버에서 업로드 완료를 확인하고 검증합니다.
   */
  @Post('complete')
  async completeUpload(
    @Body() body: CompleteUploadDto,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const { uploadId, storageKey } = body;

      // 업로드 레코드 조회
      const uploadRecord = await this.fileUploadService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('업로드 완료 권한이 없습니다.');
      }

      // 이미 완료된 업로드인지 확인
      if (uploadRecord.status === FileUploadStatus.COMPLETED) {
        return {
          success: true,
          message: '이미 완료된 업로드입니다.',
          data: uploadRecord,
        };
      }

      // Cloudflare R2에서 파일 존재 확인
      const uploadResult = await this.storageService.verifyUpload(storageKey);
      if (!uploadResult) {
        throw new Error('업로드된 파일을 찾을 수 없습니다.');
      }

      // 업로드 레코드 완료 처리
      const completedUpload = await this.fileUploadService.markAsCompleted(
        uploadId,
        uploadResult.url,
      );

      this.logger.log(
        `Upload completed for user ${user.id}: ${completedUpload.originalFileName}`,
      );

      return {
        success: true,
        message: '파일 업로드가 완료되었습니다.',
        data: {
          id: completedUpload.id,
          fileName: completedUpload.originalFileName,
          fileSize: completedUpload.fileSize,
          publicUrl: completedUpload.publicUrl,
          storageKey: completedUpload.storageKey,
          status: completedUpload.status,
        },
      };
    } catch (error) {
      this.logger.error(`Upload completion failed: ${error.message}`, error.stack);
      
      // 실패한 업로드 상태 업데이트
      if (body.uploadId) {
        await this.fileUploadService.markAsFailed(
          body.uploadId,
          error.message,
        ).catch(err => {
          this.logger.error(`Failed to mark upload as failed: ${err.message}`);
        });
      }
      
      throw error;
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
      const uploadRecord = await this.fileUploadService.findById(uploadId);
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
        await this.storageService.deleteFile(uploadRecord.storageKey).catch(err => {
          this.logger.warn(`Failed to delete file from R2: ${err.message}`);
        });
      }

      // 업로드 레코드 상태 업데이트
      const cancelledUpload = await this.fileUploadService.updateStatus(
        uploadId,
        FileUploadStatus.CANCELLED,
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
    } catch (error) {
      this.logger.error(`Upload cancellation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 파일 삭제
   * DELETE /api/v1/file-upload/:id
   * 
   * 업로드된 파일을 삭제합니다.
   */
  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const uploadId = parseInt(id);
      
      // 업로드 레코드 조회
      const uploadRecord = await this.fileUploadService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('파일 삭제 권한이 없습니다.');
      }

      // Cloudflare R2에서 파일 삭제
      if (uploadRecord.storageKey) {
        await this.storageService.deleteFile(uploadRecord.storageKey);
      }

      // 업로드 레코드 삭제
      await this.fileUploadService.deleteUploadRecord(uploadId);

      this.logger.log(
        `File deleted for user ${user.id}: ${uploadRecord.originalFileName}`,
      );

      return {
        success: true,
        message: '파일이 삭제되었습니다.',
      };
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 내 업로드 목록 조회
   * GET /api/v1/file-upload/my
   * 
   * 현재 사용자의 업로드 목록을 조회합니다.
   */
  @Get('my')
  async getMyUploads(
    @Query('status') status?: FileUploadStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const validatedLimit = Math.min(Math.max(1, limit), 100);
      const offset = (page - 1) * validatedLimit;

      const result = await this.fileUploadService.findByUser(user.id, {
        status,
        limit: validatedLimit,
        offset,
      });

      return {
        success: true,
        message: '업로드 목록을 가져왔습니다.',
        data: {
          uploads: result.uploads.map(upload => ({
            id: upload.id,
            fileName: upload.originalFileName,
            fileSize: upload.fileSize,
            mimeType: upload.mimeType,
            status: upload.status,
            publicUrl: upload.publicUrl,
            uploadType: upload.uploadType,
            progress: upload.progress,
            createdAt: upload.createdAt,
            completedAt: upload.completedAt,
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
      this.logger.error(`Failed to get user uploads: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 업로드 상세 정보 조회
   * GET /api/v1/file-upload/:id
   * 
   * 특정 업로드의 상세 정보를 조회합니다.
   */
  @Get(':id')
  async getUploadDetail(
    @Param('id') id: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      const uploadId = parseInt(id);
      
      // 업로드 레코드 조회
      const uploadRecord = await this.fileUploadService.findById(uploadId);
      if (!uploadRecord) {
        throw new NotFoundException(`Upload record not found: ${uploadId}`);
      }

      // 권한 검증
      if (uploadRecord.userId !== user.id) {
        throw new Error('업로드 조회 권한이 없습니다.');
      }

      return {
        success: true,
        message: '업로드 정보를 가져왔습니다.',
        data: {
          id: uploadRecord.id,
          fileName: uploadRecord.originalFileName,
          fileSize: uploadRecord.fileSize,
          mimeType: uploadRecord.mimeType,
          status: uploadRecord.status,
          publicUrl: uploadRecord.publicUrl,
          storageKey: uploadRecord.storageKey,
          uploadType: uploadRecord.uploadType,
          folder: uploadRecord.folder,
          metadata: uploadRecord.metadata,
          progress: uploadRecord.progress,
          errorMessage: uploadRecord.errorMessage,
          createdAt: uploadRecord.createdAt,
          startedAt: uploadRecord.startedAt,
          completedAt: uploadRecord.completedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get upload detail: ${error.message}`, error.stack);
      throw error;
    }
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
      const uploadRecord = await this.fileUploadService.findById(uploadId);
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
    } catch (error) {
      this.logger.error(`Download URL generation failed: ${error.message}`, error.stack);
      throw error;
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
      const uploadRecord = await this.fileUploadService.findById(uploadId);
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
      const isMedia = uploadRecord.mimeType.startsWith('video/') || 
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
    } catch (error) {
      this.logger.error(`Streaming URL generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}