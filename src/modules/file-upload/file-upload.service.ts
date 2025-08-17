import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudflareMediaService } from '../cloudflare-media/cloudflare-media.service';
import { StorageService } from '../storage/storage.service';
import {
  FileUpload,
  FileUploadStatus,
  FileUploadType,
} from './file-upload.entity';

@Injectable()
export class FileUploadService extends CrudService<FileUpload> {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
    private readonly cloudflareMediaService: CloudflareMediaService,
    private readonly storageService: StorageService,
  ) {
    super(fileUploadRepository);
  }

  /**
   * 새 파일 업로드 레코드 생성
   */
  async createUploadRecord(data: {
    userId: number;
    originalFileName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    uploadType: FileUploadType;
    folder?: string;
    metadata?: Record<string, any>;
  }): Promise<FileUpload> {
    const upload = this.repository.create({
      ...data,
      status: FileUploadStatus.PENDING,
    });

    const savedUpload = await this.repository.save(upload);

    this.logger.log(
      `Upload record created: ${savedUpload.id} for user ${data.userId}`,
    );
    return savedUpload;
  }

  /**
   * 업로드 레코드 조회 (ID)
   */
  async findById(id: number): Promise<FileUpload | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  /**
   * 업로드 레코드 조회 (Storage Key)
   */
  async findByStorageKey(storageKey: string): Promise<FileUpload | null> {
    return await this.repository.findOne({
      where: { storageKey },
      relations: ['user'],
    });
  }

  /**
   * 사용자별 업로드 목록 조회
   */
  async findByUser(
    userId: number,
    options?: {
      status?: FileUploadStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ uploads: FileUpload[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('upload')
      .leftJoinAndSelect('upload.user', 'user')
      .where('upload.userId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('upload.status = :status', {
        status: options.status,
      });
    }

    queryBuilder.orderBy('upload.createdAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    const [uploads, total] = await queryBuilder.getManyAndCount();

    return { uploads, total };
  }

  /**
   * 업로드 상태 업데이트
   */
  async updateStatus(
    id: number,
    status: FileUploadStatus,
  ): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    upload.status = status;

    if (status === FileUploadStatus.COMPLETED) {
      upload.completeUpload();
    }

    const updatedUpload = await this.repository.save(upload);

    this.logger.log(`Upload status updated: ${id} -> ${status}`);
    return updatedUpload;
  }

  /**
   * 업로드 실패 처리
   */
  async markAsFailed(id: number, errorMessage: string): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    upload.failUpload(errorMessage);
    const updatedUpload = await this.repository.save(upload);

    this.logger.error(`Upload failed: ${id} - ${errorMessage}`);
    return updatedUpload;
  }

  /**
   * 업로드 완료 처리
   */
  async markAsCompleted(id: number, publicUrl?: string): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    upload.completeUpload(publicUrl);
    const updatedUpload = await this.repository.save(upload);

    this.logger.log(`Upload completed: ${id}`);
    return updatedUpload;
  }

  /**
   * 오래된 실패한 업로드 정리
   */
  async cleanupFailedUploads(olderThanDays: number = 7): Promise<number> {
    const cutoffTime = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: FileUploadStatus.FAILED })
      .andWhere('createdAt < :cutoffTime', { cutoffTime })
      .execute();

    const deletedCount = result.affected || 0;

    this.logger.log(
      `Cleaned up ${deletedCount} failed upload records older than ${olderThanDays} days`,
    );
    return deletedCount;
  }

  /**
   * 업로드 재시작 (실패한 업로드)
   */
  async retryUpload(id: number): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    if (!upload.canRetry()) {
      throw new Error(
        'Upload cannot be retried (max retries reached or wrong status)',
      );
    }

    // 상태 초기화
    upload.status = FileUploadStatus.PENDING;
    upload.errorMessage = undefined;
    upload.startedAt = undefined;
    upload.completedAt = undefined;

    const updatedUpload = await this.repository.save(upload);

    this.logger.log(`Upload retry initiated: ${id}`);
    return updatedUpload;
  }

  /**
   * 업로드 레코드 삭제
   */
  async deleteUploadRecord(id: number): Promise<void> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    await this.repository.remove(upload);

    this.logger.log(`Upload record deleted: ${id}`);
  }

  /**
   * 업로드 완료 처리 (Direct Upload 완료 확인)
   */
  async completeUpload(
    uploadId: number,
    storageKey: string,
  ): Promise<FileUpload> {
    const upload = await this.findById(uploadId);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${uploadId}`);
    }

    if (upload.storageKey !== storageKey) {
      throw new Error('Storage key mismatch');
    }

    upload.status = FileUploadStatus.COMPLETED;
    upload.completedAt = new Date();

    const updatedUpload = await this.repository.save(upload);

    this.logger.log(`Upload completed via direct upload: ${uploadId}`);
    return updatedUpload;
  }

  /**
   * 파일 업로드 후 Cloudflare Media로 처리
   */
  async processWithCloudflareMedia(uploadId: number): Promise<FileUpload> {
    const upload = await this.findById(uploadId);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${uploadId}`);
    }

    try {
      // R2 URL 생성
      const fileUrl = await this.storageService.getDownloadUrl(
        upload.storageKey,
        3600,
      );

      // 서비스 가용성 확인
      const serviceStatus = this.cloudflareMediaService.getServiceStatus();

      // 비디오 파일인 경우 Cloudflare Stream으로 처리 (가능한 경우)
      if (
        this.cloudflareMediaService.isVideoFile(upload.mimeType) &&
        serviceStatus.stream
      ) {
        const result = await this.cloudflareMediaService.uploadVideo(fileUrl, {
          name: upload.originalFileName,
          requireSignedURLs: false,
          thumbnailTimestampPct: 0.5,
        });

        upload.cloudflareMediaId = result.id;
        upload.mediaStorage = 'stream';
        upload.publicUrl = result.publicUrl;
        upload.thumbnailUrl = result.thumbnailUrl;
        upload.mediaVariants = {
          hls: result.streamingUrls?.hls,
          dash: result.streamingUrls?.dash,
        };
        upload.metadata = {
          ...upload.metadata,
          ...result.metadata,
        };
      }
      // 이미지 파일인 경우 Cloudflare Images로 처리 (가능한 경우)
      else if (
        this.cloudflareMediaService.isImageFile(upload.mimeType) &&
        serviceStatus.images
      ) {
        const result = await this.cloudflareMediaService.uploadImage(fileUrl, {
          filename: upload.originalFileName,
          requireSignedURLs: false,
        });

        upload.cloudflareMediaId = result.id;
        upload.mediaStorage = 'images';
        upload.publicUrl = result.publicUrl;
        upload.thumbnailUrl = result.thumbnailUrl;
        upload.mediaVariants = result.variants;
      }
      // Stream/Images 서비스 불가능하거나 일반 파일인 경우 R2 사용
      else {
        upload.mediaStorage = 'r2';
        upload.publicUrl = fileUrl;
        
        // 비디오/이미지인데 전용 서비스를 사용할 수 없는 경우 경고
        if (this.cloudflareMediaService.isVideoFile(upload.mimeType) && !serviceStatus.stream) {
          this.logger.warn(`Cloudflare Stream not available. Using R2 for video: ${uploadId}`);
        }
        if (this.cloudflareMediaService.isImageFile(upload.mimeType) && !serviceStatus.images) {
          this.logger.warn(`Cloudflare Images not available. Using R2 for image: ${uploadId}`);
        }
      }

      upload.status = FileUploadStatus.COMPLETED;
      upload.completedAt = new Date();

      const updatedUpload = await this.repository.save(upload);
      this.logger.log(
        `File processed with Cloudflare Media: ${uploadId} -> ${upload.mediaStorage}`,
      );
      return updatedUpload;
    } catch (error) {
      this.logger.error(
        `Failed to process with Cloudflare Media: ${uploadId}`,
        error,
      );
      upload.failUpload(error.message);
      await this.repository.save(upload);
      throw error;
    }
  }

  /**
   * Direct Upload URL 생성 (Cloudflare Media)
   */
  async generateDirectUploadUrl(
    mimeType: string,
    metadata?: any,
  ): Promise<{
    uploadUrl: string;
    id: string;
    type: 'video' | 'image' | 'file';
  }> {
    // 비디오 파일인 경우
    if (this.cloudflareMediaService.isVideoFile(mimeType)) {
      const result = await this.cloudflareMediaService.generateVideoUploadUrl(
        metadata?.maxDurationSeconds,
        metadata?.requireSignedURLs,
      );
      return {
        uploadUrl: result.uploadUrl,
        id: result.uid,
        type: 'video',
      };
    }
    // 이미지 파일인 경우
    else if (this.cloudflareMediaService.isImageFile(mimeType)) {
      const result = await this.cloudflareMediaService.generateImageUploadUrl(
        metadata?.requireSignedURLs,
      );
      return {
        uploadUrl: result.uploadUrl,
        id: result.id,
        type: 'image',
      };
    }
    // 일반 파일은 R2 Presigned URL 사용
    else {
      const fileName = `${Date.now()}_${metadata?.filename || 'file'}`;
      const result = await this.storageService.generatePresignedUploadUrl(
        fileName,
        'uploads',
        mimeType,
        metadata?.fileSize,
        metadata,
      );
      return {
        uploadUrl: result.uploadUrl,
        id: result.key,
        type: 'file',
      };
    }
  }

  /**
   * Cloudflare Media 상태 확인 (비디오)
   */
  async checkVideoProcessingStatus(
    cloudflareMediaId: string,
  ): Promise<{
    ready: boolean;
    status: string;
    percentComplete?: number;
  }> {
    return await this.cloudflareMediaService.getVideoStatus(cloudflareMediaId);
  }

  /**
   * Cloudflare Media 삭제
   */
  async deleteFromCloudflareMedia(uploadId: number): Promise<void> {
    const upload = await this.findById(uploadId);
    if (!upload || !upload.cloudflareMediaId) {
      return;
    }

    try {
      if (upload.mediaStorage === 'stream') {
        await this.cloudflareMediaService.deleteVideo(upload.cloudflareMediaId);
      } else if (upload.mediaStorage === 'images') {
        await this.cloudflareMediaService.deleteImage(upload.cloudflareMediaId);
      }

      this.logger.log(
        `Deleted from Cloudflare ${upload.mediaStorage}: ${upload.cloudflareMediaId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete from Cloudflare Media: ${upload.cloudflareMediaId}`,
        error,
      );
    }
  }
}
