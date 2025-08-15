import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import {
  ExternalServiceException,
  FileSizeExceededException,
  FileTypeNotSupportedException,
  FileUploadException,
  FileUploadFailedException,
} from '../../common/exceptions/business.exception';
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

interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: Date;
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
   * Presigned URL 생성 (Direct Upload용)
   */
  async generatePresignedUploadUrl(
    filename: string,
    folder: keyof typeof STORAGE_SETTINGS.folders,
    contentType: string,
    fileSize: number,
    metadata?: Record<string, string>,
  ): Promise<PresignedUploadUrl> {
    try {
      // 파일 타입 검증
      const fileType = this.getFileType(filename);
      if (!isValidFileType(filename, fileType)) {
        const allowedTypes = this.getAllowedFileTypes();
        throw new FileTypeNotSupportedException(contentType, allowedTypes);
      }

      // 파일 크기 검증
      if (!isValidFileSize(fileSize, fileType)) {
        const maxSize = this.getMaxSize(fileType);
        throw new FileSizeExceededException(fileSize, maxSize);
      }

      // 파일 키 생성
      const key = this.generateFileKey(filename, folder);

      // 메타데이터 준비
      const uploadMetadata = {
        'original-name': filename,
        'upload-date': new Date().toISOString(),
        'file-type': fileType,
        size: fileSize.toString(),
        ...metadata,
      };

      // Presigned URL 생성 (5분 유효)
      const command = new PutObjectCommand({
        Bucket: STORAGE_SETTINGS.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: fileSize,
        Metadata: uploadMetadata,
        CacheControl: 'max-age=31536000', // 1년 캐시
      });

      const expiresIn = 300; // 5분
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      const publicUrl = this.getPublicUrl(key);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(`✅ Presigned URL generated for: ${key}`);

      return {
        uploadUrl,
        key,
        publicUrl,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `❌ Presigned URL generation failed: ${filename}`,
        error,
      );

      // 이미 커스텀 예외인 경우 그대로 던지기
      if (
        error instanceof FileUploadException ||
        error instanceof FileSizeExceededException ||
        error instanceof FileTypeNotSupportedException
      ) {
        throw error;
      }

      // AWS/R2 관련 오류
      if (error.name === 'NoSuchBucket') {
        throw new ExternalServiceException(
          'Cloudflare R2',
          '버킷을 찾을 수 없습니다.',
        );
      }

      if (error.name === 'AccessDenied') {
        throw new ExternalServiceException(
          'Cloudflare R2',
          '접근 권한이 없습니다.',
        );
      }

      // 일반적인 업로드 실패
      throw new FileUploadFailedException(error.message);
    }
  }

  /**
   * 파일 업로드 완료 확인 및 검증
   */
  async verifyUpload(key: string): Promise<UploadResult | null> {
    try {
      const fileInfo = await this.getFileInfo(key);

      if (!fileInfo) {
        return null;
      }

      return {
        key,
        url: this.getPublicUrl(key),
        size: fileInfo.size,
        contentType: fileInfo.contentType,
      };
    } catch (error) {
      this.logger.error(`❌ Upload verification failed:`, error);
      throw error;
    }
  }

  /**
   * 파일 다운로드 (Signed URL 생성 - Range 요청 지원)
   *
   * Cloudflare R2는 자동으로 HTTP Range 요청을 지원합니다.
   * 클라이언트는 생성된 URL에 Range 헤더를 포함하여 요청할 수 있습니다.
   *
   * 예시:
   * - Range: bytes=0-1048575 (첫 1MB)
   * - Range: bytes=1048576- (1MB 이후부터 끝까지)
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
   * 스트리밍용 URL 생성 (비디오/오디오용)
   *
   * Cloudflare R2의 공개 URL을 반환합니다.
   * 브라우저가 자동으로 Range 요청을 사용하여 스트리밍합니다.
   */
  async getStreamingUrl(key: string): Promise<string> {
    // 공개 URL 반환 (CDN 경유)
    return this.getPublicUrl(key);
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
   * 허용된 파일 타입 목록 반환
   */
  private getAllowedFileTypes(): string[] {
    const imageTypes = STORAGE_SETTINGS.allowedImageTypes.map(
      (ext) => `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    );
    const videoTypes = STORAGE_SETTINGS.allowedVideoTypes.map(
      (ext) => `video/${ext}`,
    );
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ];

    return [...imageTypes, ...videoTypes, ...documentTypes];
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
