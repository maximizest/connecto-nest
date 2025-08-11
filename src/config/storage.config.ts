import { S3ClientConfig } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import { ENV_KEYS, FILE_CONSTANTS } from '../common/constants/app.constants';

// 환경변수 로드
dotenv.config();

/**
 * Cloudflare R2 스토리지 설정
 */
export const STORAGE_CONFIG: S3ClientConfig = {
  endpoint: process.env[ENV_KEYS.STORAGE_ENDPOINT],
  region: process.env[ENV_KEYS.STORAGE_REGION] || 'auto',
  credentials: {
    accessKeyId: process.env[ENV_KEYS.STORAGE_ACCESS_KEY_ID]!,
    secretAccessKey: process.env[ENV_KEYS.STORAGE_SECRET_ACCESS_KEY]!,
  },
  forcePathStyle: true, // R2 호환성을 위해 필요
};

/**
 * 스토리지 관련 설정
 */
export const STORAGE_SETTINGS = {
  bucket: process.env[ENV_KEYS.STORAGE_BUCKET] || 'connecto',
  publicUrl: process.env[ENV_KEYS.STORAGE_PUBLIC_URL],

  // 파일 크기 제한 (env에서 가져오거나 기본값 사용)
  maxFileSize: parseInt(
    process.env[ENV_KEYS.MAX_FILE_SIZE] ||
      FILE_CONSTANTS.DEFAULT_MAX_FILE_SIZE.toString(),
  ),
  maxImageSize: parseInt(
    process.env[ENV_KEYS.MAX_IMAGE_SIZE] ||
      FILE_CONSTANTS.DEFAULT_MAX_IMAGE_SIZE.toString(),
  ),
  maxVideoSize: parseInt(
    process.env[ENV_KEYS.MAX_VIDEO_SIZE] ||
      FILE_CONSTANTS.DEFAULT_MAX_VIDEO_SIZE.toString(),
  ),

  // 허용된 파일 형식
  allowedImageTypes:
    process.env[ENV_KEYS.ALLOWED_IMAGE_TYPES]?.split(',') ||
    FILE_CONSTANTS.ALLOWED_IMAGE_TYPES,
  allowedVideoTypes:
    process.env[ENV_KEYS.ALLOWED_VIDEO_TYPES]?.split(',') ||
    FILE_CONSTANTS.ALLOWED_VIDEO_TYPES,
  allowedFileTypes:
    process.env[ENV_KEYS.ALLOWED_FILE_TYPES]?.split(',') ||
    FILE_CONSTANTS.ALLOWED_FILE_TYPES,

  // 업로드 설정
  chunkSize: FILE_CONSTANTS.CHUNK_SIZE,
  uploadTimeout: FILE_CONSTANTS.UPLOAD_TIMEOUT,

  // 썸네일 설정
  thumbnailSize: FILE_CONSTANTS.THUMBNAIL_SIZE,

  // 폴더 구조
  folders: {
    images: 'images',
    videos: 'videos',
    files: 'files',
    thumbnails: 'thumbnails',
    temp: 'temp',
  },

  // CDN 설정
  cdnEnabled: true,
  cdnUrl: process.env[ENV_KEYS.STORAGE_PUBLIC_URL],
};

/**
 * 스토리지 환경변수 검증
 */
export const validateStorageConfig = () => {
  // 테스트 환경에서는 조용히 검증
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const requiredEnvVars = [
    ENV_KEYS.STORAGE_ENDPOINT,
    ENV_KEYS.STORAGE_BUCKET,
    ENV_KEYS.STORAGE_ACCESS_KEY_ID,
    ENV_KEYS.STORAGE_SECRET_ACCESS_KEY,
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing required storage environment variables:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your Cloudflare R2 configuration.');
    process.exit(1);
  }

  // 파일 크기 검증
  const maxFileSize = STORAGE_SETTINGS.maxFileSize;
  if (maxFileSize < 1024) {
    console.warn(`⚠️  MAX_FILE_SIZE is very small: ${maxFileSize} bytes`);
  }

  console.log('✅ Storage Configuration validated');
  console.log(`   - Endpoint: ${STORAGE_CONFIG.endpoint}`);
  console.log(`   - Bucket: ${STORAGE_SETTINGS.bucket}`);
  console.log(`   - Region: ${STORAGE_CONFIG.region}`);
  console.log(
    `   - Max File Size: ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`,
  );
  console.log(
    `   - Max Image Size: ${(STORAGE_SETTINGS.maxImageSize / 1024 / 1024).toFixed(0)}MB`,
  );
  console.log(
    `   - Max Video Size: ${(STORAGE_SETTINGS.maxVideoSize / 1024 / 1024).toFixed(0)}MB`,
  );
  console.log(
    `   - CDN: ${STORAGE_SETTINGS.cdnEnabled ? 'enabled' : 'disabled'}`,
  );
};

/**
 * 파일 타입 검증 헬퍼 함수
 */
export const isValidFileType = (
  filename: string,
  type: 'image' | 'video' | 'file',
): boolean => {
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) return false;

  switch (type) {
    case 'image':
      return STORAGE_SETTINGS.allowedImageTypes.includes(extension as any);
    case 'video':
      return STORAGE_SETTINGS.allowedVideoTypes.includes(extension as any);
    case 'file':
      return STORAGE_SETTINGS.allowedFileTypes.includes(extension as any);
    default:
      return false;
  }
};

/**
 * 파일 크기 검증 헬퍼 함수
 */
export const isValidFileSize = (
  size: number,
  type: 'image' | 'video' | 'file',
): boolean => {
  switch (type) {
    case 'image':
      return size <= STORAGE_SETTINGS.maxImageSize;
    case 'video':
      return size <= STORAGE_SETTINGS.maxVideoSize;
    case 'file':
      return size <= STORAGE_SETTINGS.maxFileSize;
    default:
      return false;
  }
};
