import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    uploadId?: string;
    totalChunks?: number;
    metadata?: Record<string, any>;
  }): Promise<FileUpload> {
    const upload = this.repository.create({
      ...data,
      status: FileUploadStatus.PENDING,
      totalChunks: data.totalChunks || 0,
      completedChunks: 0,
      uploadedBytes: 0,
      progress: 0,
      retryCount: 0,
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
   * 업로드 레코드 조회 (Upload ID)
   */
  async findByUploadId(uploadId: string): Promise<FileUpload | null> {
    return await this.repository.findOne({
      where: { uploadId },
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

    if (status === FileUploadStatus.UPLOADING && !upload.startedAt) {
      upload.startUpload();
    } else if (status === FileUploadStatus.COMPLETED) {
      upload.completeUpload();
    } else if (status === FileUploadStatus.CANCELLED) {
      upload.cancelUpload();
    }

    const updatedUpload = await this.repository.save(upload);

    this.logger.log(`Upload status updated: ${id} -> ${status}`);
    return updatedUpload;
  }

  /**
   * 청크 완료 업데이트
   */
  async updateChunkProgress(
    id: number,
    chunkSize: number,
    publicUrl?: string,
  ): Promise<FileUpload> {
    const upload = await this.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload record not found: ${id}`);
    }

    upload.completeChunk(chunkSize);

    // 모든 청크가 완료되면 상태를 완료로 변경
    if (
      upload.completedChunks >= upload.totalChunks &&
      upload.totalChunks > 0
    ) {
      upload.completeUpload(publicUrl);
    }

    const updatedUpload = await this.repository.save(upload);

    this.logger.log(
      `Chunk progress updated: ${id} (${upload.completedChunks}/${upload.totalChunks})`,
    );

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
   * 진행 중인 업로드 목록 조회
   */
  async findInProgressUploads(
    olderThanMinutes: number = 60,
  ): Promise<FileUpload[]> {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    return await this.repository.find({
      where: {
        status: FileUploadStatus.UPLOADING,
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
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
    upload.completedChunks = 0;
    upload.uploadedBytes = 0;
    upload.progress = 0;
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
}
