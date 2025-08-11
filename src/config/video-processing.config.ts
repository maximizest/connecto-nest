import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import * as dotenv from 'dotenv';
import * as ffmpeg from 'fluent-ffmpeg';
import { ENV_KEYS } from '../common/constants/app.constants';

// 환경변수 로드
dotenv.config();

/**
 * FFmpeg 설정
 */
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * 비디오 프로세싱 설정
 */
export const VIDEO_PROCESSING_CONFIG = {
  // FFmpeg 경로
  ffmpegPath: ffmpegPath.path,
  ffprobePath: ffprobePath.path,

  // 프로세싱 제한
  maxFileSize: 500 * 1024 * 1024, // 500MB
  maxResolution: {
    width: 1920,
    height: 1080,
  },
  maxDuration: 60 * 60, // 1시간

  // 출력 설정
  outputFormats: ['mp4', 'webm'],
  videoCodec: 'libx264',
  audioCodec: 'aac',

  // 품질 프로필
  qualityProfiles: {
    low: {
      resolution: '480x270',
      videoBitrate: '500k',
      audioBitrate: '64k',
      fps: 24,
      quality: 'fast',
    },
    medium: {
      resolution: '720x480',
      videoBitrate: '1000k',
      audioBitrate: '128k',
      fps: 30,
      quality: 'medium',
    },
    high: {
      resolution: '1280x720',
      videoBitrate: '2000k',
      audioBitrate: '192k',
      fps: 30,
      quality: 'slow',
    },
    ultra: {
      resolution: '1920x1080',
      videoBitrate: '4000k',
      audioBitrate: '256k',
      fps: 60,
      quality: 'veryslow',
    },
  },

  // 썸네일 설정
  thumbnail: {
    count: 5, // 추출할 썸네일 수
    resolution: '320x180',
    format: 'png',
    quality: 80,
    timestamps: ['1%', '25%', '50%', '75%', '99%'], // 비디오 길이 대비 %
  },

  // 프로세싱 설정
  processing: {
    timeoutMs: 10 * 60 * 1000, // 10분
    maxConcurrentJobs: parseInt(
      process.env[ENV_KEYS.VIDEO_MAX_CONCURRENT_JOBS] || '2',
    ),
    tempDirectory:
      process.env[ENV_KEYS.VIDEO_TEMP_DIR] || '/tmp/video-processing',
    cleanupAfterHours: 24, // 임시 파일 정리 시간
  },

  // 메타데이터 추출 설정
  metadata: {
    extractAudio: true,
    extractSubtitles: false,
    generatePreview: true,
    previewDurationSec: 10,
  },
};

/**
 * 품질별 파일 크기 예측
 */
export const estimateOutputSize = (
  inputSizeMB: number,
  durationSeconds: number,
  quality: keyof typeof VIDEO_PROCESSING_CONFIG.qualityProfiles,
): number => {
  const profile = VIDEO_PROCESSING_CONFIG.qualityProfiles[quality];

  // 비트레이트 기반 계산 (대략적)
  const videoBitrate = parseInt(profile.videoBitrate.replace('k', '')) * 1000;
  const audioBitrate = parseInt(profile.audioBitrate.replace('k', '')) * 1000;
  const totalBitrate = videoBitrate + audioBitrate;

  // 예상 파일 크기 (bytes)
  const estimatedSizeBytes = (totalBitrate * durationSeconds) / 8;

  return Math.round(estimatedSizeBytes / (1024 * 1024)); // MB로 변환
};

/**
 * 지원되는 비디오 포맷 확인
 */
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'avi',
  'mov',
  'webm',
  'mkv',
  'flv',
  '3gp',
  'wmv',
  'm4v',
];

/**
 * 지원되는 오디오 포맷 확인
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'aac',
  'wav',
  'ogg',
  'wma',
  'flac',
  'm4a',
];

/**
 * 비디오 프로세싱 환경변수 검증
 */
export const validateVideoProcessingConfig = () => {
  // 테스트 환경에서는 검증 건너뛰기
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // FFmpeg 경로 확인
  if (!ffmpegPath.path) {
    throw new Error('FFmpeg executable not found');
  }

  if (!ffprobePath.path) {
    throw new Error('FFprobe executable not found');
  }

  // 임시 디렉토리 생성 확인
  const fs = require('fs');
  const tempDir = VIDEO_PROCESSING_CONFIG.processing.tempDirectory;

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (error) {
    console.warn(`Warning: Could not create temp directory: ${tempDir}`);
  }

  console.log('✅ Video Processing Configuration validated');
  console.log(`   - FFmpeg: ${ffmpegPath.path}`);
  console.log(`   - FFprobe: ${ffprobePath.path}`);
  console.log(
    `   - Max file size: ${VIDEO_PROCESSING_CONFIG.maxFileSize / (1024 * 1024)}MB`,
  );
  console.log(
    `   - Max concurrent jobs: ${VIDEO_PROCESSING_CONFIG.processing.maxConcurrentJobs}`,
  );
  console.log(`   - Temp directory: ${tempDir}`);
};

/**
 * 비디오 해상도 문자열 파싱
 */
export const parseResolution = (
  resolution: string,
): { width: number; height: number } => {
  const [width, height] = resolution.split('x').map(Number);
  return { width, height };
};

/**
 * 프로세싱 품질에 따른 예상 시간 계산 (분)
 */
export const estimateProcessingTime = (
  fileSizeMB: number,
  durationSeconds: number,
  quality: keyof typeof VIDEO_PROCESSING_CONFIG.qualityProfiles,
): number => {
  // 품질별 처리 시간 계수
  const timeMultipliers = {
    low: 0.5,
    medium: 1.0,
    high: 2.0,
    ultra: 4.0,
  };

  const baseProcessingTime = (fileSizeMB / 100) * (durationSeconds / 60); // 기본 처리 시간
  const qualityMultiplier = timeMultipliers[quality];

  return Math.max(1, Math.round(baseProcessingTime * qualityMultiplier));
};
