import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import {
  STORAGE_CONFIG,
  STORAGE_SETTINGS,
  isValidFileSize,
  isValidFileType,
} from '../../config/storage.config';

interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag?: string;
}

interface MultipartUpload {
  uploadId: string;
  key: string;
  parts: { partNumber: number; etag: string }[];
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client(STORAGE_CONFIG);
    this.logger.log('🗄️ Cloudflare R2 Storage initialized');
  }

  /**
   * 파일 업로드 (단일 파일)
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: keyof typeof STORAGE_SETTINGS.folders,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      // 파일 타입 검증
      const fileType = this.getFileType(file.originalname);
      if (!isValidFileType(file.originalname, fileType)) {
        throw new Error(`지원하지 않는 파일 형식입니다: ${file.originalname}`);
      }

      // 파일 크기 검증
      if (!isValidFileSize(file.size, fileType)) {
        const maxSize = this.getMaxSize(fileType);
        throw new Error(
          `파일 크기가 너무 큽니다. 최대 ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
        );
      }

      // 파일 키 생성
      const key = this.generateFileKey(file.originalname, folder);

      // 메타데이터 준비
      const uploadMetadata = {
        'original-name': file.originalname,
        'upload-date': new Date().toISOString(),
        'file-type': fileType,
        size: file.size.toString(),
        ...metadata,
      };

      // S3에 업로드
      const command = new PutObjectCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: uploadMetadata,
        CacheControl: 'max-age=31536000', // 1년 캐시
      });

      const result = await this.s3Client.send(command);
      const url = this.getPublicUrl(key);

      this.logger.log(`✅ File uploaded successfully: ${key}`);

      return {
        key,
        url,
        size: file.size,
        contentType: file.mimetype,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`❌ File upload failed:`, error);
      throw error;
    }
  }

  /**
   * 대용량 파일 멀티파트 업로드 시작
   */
  async initiateMultipartUpload(
    filename: string,
    folder: keyof typeof STORAGE_SETTINGS.folders,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ uploadId: string; key: string }> {
    try {
      const key = this.generateFileKey(filename, folder);

      const command = new CreateMultipartUploadCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        ContentType: contentType,
        Metadata: {
          'original-name': filename,
          'upload-date': new Date().toISOString(),
          ...metadata,
        },
        CacheControl: 'max-age=31536000',
      });

      const result = await this.s3Client.send(command);

      this.logger.log(`🔄 Multipart upload initiated: ${key}`);

      return {
        uploadId: result.UploadId!,
        key,
      };
    } catch (error) {
      this.logger.error(`❌ Multipart upload initiation failed:`, error);
      throw error;
    }
  }

  /**
   * 멀티파트 업로드 - 파트 업로드
   */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer,
  ): Promise<{ etag: string; partNumber: number }> {
    try {
      const command = new UploadPartCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
        Body: body,
      });

      const result = await this.s3Client.send(command);

      return {
        etag: result.ETag!,
        partNumber,
      };
    } catch (error) {
      this.logger.error(`❌ Part upload failed (part ${partNumber}):`, error);
      throw error;
    }
  }

  /**
   * 멀티파트 업로드 완료
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<UploadResult> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part) => ({
            ETag: part.etag,
            PartNumber: part.partNumber,
          })),
        },
      });

      const result = await this.s3Client.send(command);

      // 파일 정보 가져오기
      const headResult = await this.getFileInfo(key);

      const uploadResult: UploadResult = {
        key,
        url: this.getPublicUrl(key),
        size: headResult?.size || 0,
        contentType: headResult?.contentType || 'application/octet-stream',
        etag: result.ETag,
      };

      this.logger.log(`✅ Multipart upload completed: ${key}`);

      return uploadResult;
    } catch (error) {
      this.logger.error(`❌ Multipart upload completion failed:`, error);
      throw error;
    }
  }

  /**
   * 멀티파트 업로드 취소
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        UploadId: uploadId,
      });

      await this.s3Client.send(command);
      this.logger.log(`🚫 Multipart upload aborted: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Multipart upload abort failed:`, error);
      throw error;
    }
  }

  /**
   * 파일 다운로드 (Signed URL 생성)
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`❌ Download URL generation failed:`, error);
      throw error;
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`🗑️ File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`❌ File deletion failed:`, error);
      throw error;
    }
  }

  /**
   * 파일 정보 조회
   */
  async getFileInfo(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata?: Record<string, string>;
  } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
      });

      const result = await this.s3Client.send(command);

      return {
        size: result.ContentLength || 0,
        contentType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        metadata: result.Metadata,
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      this.logger.error(`❌ File info retrieval failed:`, error);
      throw error;
    }
  }

  /**
   * 폴더 내 파일 목록 조회
   */
  async listFiles(
    folder: keyof typeof STORAGE_SETTINGS.folders,
    maxKeys: number = 100,
  ): Promise<string[]> {
    try {
      const prefix = `${STORAGE_SETTINGS.folders[folder]}/`;

      const command = new ListObjectsV2Command({
        Bucket: STORAGE_SETTINGS.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const result = await this.s3Client.send(command);

      return result.Contents?.map((item) => item.Key!) || [];
    } catch (error) {
      this.logger.error(`❌ File listing failed:`, error);
      throw error;
    }
  }

  /**
   * 파일 키 생성 (중복 방지)
   */
  private generateFileKey(
    originalName: string,
    folder: keyof typeof STORAGE_SETTINGS.folders,
  ): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const baseName = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '');

    return `${STORAGE_SETTINGS.folders[folder]}/${timestamp}-${randomString}-${baseName}.${extension}`;
  }

  /**
   * 공개 URL 생성
   */
  private getPublicUrl(key: string): string {
    if (STORAGE_SETTINGS.cdnEnabled && STORAGE_SETTINGS.cdnUrl) {
      return `${STORAGE_SETTINGS.cdnUrl}/${key}`;
    }

    return `${STORAGE_CONFIG.endpoint}/${STORAGE_SETTINGS.bucket}/${key}`;
  }

  /**
   * 파일 타입 결정
   */
  private getFileType(filename: string): 'image' | 'video' | 'file' {
    const extension = filename.toLowerCase().split('.').pop();
    if (!extension) return 'file';

    if (STORAGE_SETTINGS.allowedImageTypes.includes(extension as any)) {
      return 'image';
    } else if (STORAGE_SETTINGS.allowedVideoTypes.includes(extension as any)) {
      return 'video';
    } else {
      return 'file';
    }
  }

  /**
   * 파일 타입별 최대 크기 반환
   */
  private getMaxSize(fileType: 'image' | 'video' | 'file'): number {
    switch (fileType) {
      case 'image':
        return STORAGE_SETTINGS.maxImageSize;
      case 'video':
        return STORAGE_SETTINGS.maxVideoSize;
      case 'file':
        return STORAGE_SETTINGS.maxFileSize;
    }
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: STORAGE_SETTINGS.bucket,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      this.logger.error('Storage health check failed:', error);
      return false;
    }
  }
}
