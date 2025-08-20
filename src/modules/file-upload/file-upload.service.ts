import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { StorageService } from '../storage/storage.service';
import { FileUpload } from './file-upload.entity';
import { FileUploadStatus } from './enums/file-upload-status.enum';
import { FileUploadType } from './enums/file-upload-type.enum';

@Injectable()
export class FileUploadService extends CrudService<FileUpload> {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly storageService: StorageService) {
    super(FileUpload.getRepository());
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
    const upload = FileUpload.create({
      ...data,
      status: FileUploadStatus.PENDING,
    });

    const savedUpload = await upload.save();

    this.logger.log(
      `Upload record created: ${savedUpload.id} for user ${data.userId}`,
    );
    return savedUpload;
  }

  /**
   * 업로드 레코드 조회 (ID)
   */
  async findById(id: number): Promise<FileUpload | null> {
    return await FileUpload.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  /**
   * 업로드 레코드 조회 (Storage Key)
   */
  async findByStorageKey(storageKey: string): Promise<FileUpload | null> {
    return await FileUpload.findOne({
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
    const queryBuilder = FileUpload.createQueryBuilder('upload')
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

    const updatedUpload = await upload.save();

    this.logger.log(`Upload status updated: ${id} -> ${status}`);
    return updatedUpload;
  }

  /**
   * 업로드 실패 처리
   */
  async markAsFailed(id: number): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    upload.failUpload();
    const updatedUpload = await upload.save();

    this.logger.error(`Upload failed: ${id}`);
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
    const updatedUpload = await upload.save();

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

    const result = await FileUpload.createQueryBuilder()
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

    const updatedUpload = await upload.save();

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

    await upload.remove();

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

    const updatedUpload = await upload.save();

    this.logger.log(`Upload completed via direct upload: ${uploadId}`);
    return updatedUpload;
  }

  /**
   * Direct Upload URL 생성
   */
  async generateDirectUploadUrl(
    mimeType: string,
    metadata?: any,
  ): Promise<{
    uploadUrl: string;
    id: string;
    type: 'file';
  }> {
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
