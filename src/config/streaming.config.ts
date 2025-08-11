import * as dotenv from 'dotenv';
import { ENV_KEYS } from '../common/constants/app.constants';

// 환경변수 로드
dotenv.config();

/**
 * 스트리밍 최적화 설정
 */
export const STREAMING_CONFIG = {
  // HTTP Range 요청 설정
  range: {
    chunkSize: 1024 * 1024, // 1MB 기본 청크 크기
    maxChunkSize: 5 * 1024 * 1024, // 5MB 최대 청크 크기
    minChunkSize: 256 * 1024, // 256KB 최소 청크 크기
    enablePartialContent: true,
    cacheHeaders: {
      maxAge: 31536000, // 1년 (초)
      etag: true,
      lastModified: true,
    },
  },

  // 적응형 비트레이트 스트리밍 (HLS/DASH)
  adaptiveBitrate: {
    enabled: true,
    segmentDuration: 6, // 6초 세그먼트
    playlistWindow: 5, // 5개 세그먼트 윈도우
    formats: {
      hls: {
        enabled: true,
        extension: 'm3u8',
        segmentExtension: 'ts',
        targetDuration: 6,
      },
      dash: {
        enabled: false, // 향후 확장을 위해 비활성화
        extension: 'mpd',
        segmentExtension: 'm4s',
      },
    },
    qualities: [
      {
        name: 'low',
        resolution: '480x270',
        videoBitrate: '500k',
        audioBitrate: '64k',
        bandwidth: 600000,
      },
      {
        name: 'medium',
        resolution: '720x480',
        videoBitrate: '1000k',
        audioBitrate: '128k',
        bandwidth: 1200000,
      },
      {
        name: 'high',
        resolution: '1280x720',
        videoBitrate: '2000k',
        audioBitrate: '192k',
        bandwidth: 2400000,
      },
      {
        name: 'ultra',
        resolution: '1920x1080',
        videoBitrate: '4000k',
        audioBitrate: '256k',
        bandwidth: 4800000,
      },
    ],
  },

  // CDN 및 캐싱 설정
  cdn: {
    enabled: true,
    baseUrl: process.env[ENV_KEYS.STREAMING_CDN_BASE_URL] || '',
    regions: ['us-east', 'eu-west', 'ap-southeast'],
    cacheStrategies: {
      video: {
        maxAge: 86400, // 24시간
        staleWhileRevalidate: 3600, // 1시간
      },
      thumbnails: {
        maxAge: 604800, // 7일
        staleWhileRevalidate: 86400, // 24시간
      },
      playlists: {
        maxAge: 30, // 30초
        staleWhileRevalidate: 10, // 10초
      },
    },
  },

  // 비디오 세그멘테이션 설정
  segmentation: {
    enabled: true,
    keyframeInterval: 2, // 2초마다 키프레임
    segmentLength: 6, // 6초 세그먼트
    maxSegments: 100, // 최대 100개 세그먼트
    tempDirectory: process.env[ENV_KEYS.STREAMING_TEMP_DIR] || '/tmp/streaming',
    cleanup: {
      enabled: true,
      retentionHours: 24, // 24시간 후 정리
      maxDiskUsageGB: 50, // 최대 50GB 디스크 사용량
    },
  },

  // 대역폭 최적화
  bandwidth: {
    detection: {
      enabled: true,
      testDuration: 5000, // 5초 테스트
      minSamples: 3,
      adaptationThreshold: 0.2, // 20% 변화시 적응
    },
    throttling: {
      enabled: true,
      maxConcurrentStreams: parseInt(
        process.env[ENV_KEYS.STREAMING_MAX_CONCURRENT] || '10',
      ),
      rateLimitPerUser: 5, // 사용자당 최대 5개 동시 스트림
      bandwidthLimit: 100 * 1024 * 1024, // 100Mbps per user
    },
  },

  // 프리로딩 및 버퍼링
  buffering: {
    initialBuffer: 3, // 3초 초기 버퍼
    maxBuffer: 30, // 30초 최대 버퍼
    rebufferThreshold: 1, // 1초 이하시 재버퍼링
    seekBufferSize: 5, // 5초 씩 프리로드
    qualityDowngradeThreshold: 3, // 3회 버퍼링시 품질 다운그레이드
  },

  // 지원 포맷 및 코덱
  codecs: {
    video: {
      h264: {
        enabled: true,
        profile: 'main',
        level: '4.1',
        preset: 'faster',
      },
      h265: {
        enabled: false, // 향후 지원
        profile: 'main',
        level: '5.1',
      },
    },
    audio: {
      aac: {
        enabled: true,
        profile: 'lc',
        sampleRate: 44100,
      },
      opus: {
        enabled: false, // 향후 지원
        bitrate: 128,
      },
    },
  },

  // 스트리밍 분석 및 모니터링
  analytics: {
    enabled: true,
    trackEvents: [
      'stream_start',
      'stream_end',
      'quality_change',
      'buffering',
      'seek',
      'error',
    ],
    samplingRate: 1.0, // 100% 이벤트 수집
    batchSize: 100,
    flushInterval: 30000, // 30초마다 전송
  },

  // 디바이스별 최적화
  deviceOptimization: {
    mobile: {
      maxQuality: 'medium',
      preferredFormat: 'hls',
      adaptiveEnabled: true,
    },
    tablet: {
      maxQuality: 'high',
      preferredFormat: 'hls',
      adaptiveEnabled: true,
    },
    desktop: {
      maxQuality: 'ultra',
      preferredFormat: 'hls',
      adaptiveEnabled: true,
    },
  },

  // 보안 설정
  security: {
    tokenValidation: true,
    refererCheck: true,
    geoblocking: {
      enabled: false,
      allowedCountries: [], // 빈 배열은 모든 국가 허용
    },
    drmSupport: {
      enabled: false, // 향후 확장
      providers: [],
    },
  },
};

/**
 * 대역폭별 권장 품질 매핑
 */
export const getBandwidthQualityMapping = () => ({
  low: { minBandwidth: 0, maxBandwidth: 800000 }, // ~800 Kbps
  medium: { minBandwidth: 800000, maxBandwidth: 1500000 }, // 800K~1.5M
  high: { minBandwidth: 1500000, maxBandwidth: 3000000 }, // 1.5M~3M
  ultra: { minBandwidth: 3000000, maxBandwidth: Infinity }, // 3M+
});

/**
 * 디바이스 타입 감지
 */
export const detectDeviceType = (
  userAgent: string,
): keyof typeof STREAMING_CONFIG.deviceOptimization => {
  const ua = userAgent.toLowerCase();

  if (/mobile|android|iphone|ipod/.test(ua)) {
    return 'mobile';
  } else if (/tablet|ipad/.test(ua)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

/**
 * 스트리밍 URL 생성
 */
export const generateStreamingUrl = (
  baseUrl: string,
  storageKey: string,
  format: 'hls' | 'dash' = 'hls',
  quality?: string,
): string => {
  const formatExtension =
    STREAMING_CONFIG.adaptiveBitrate.formats[format].extension;
  const qualityParam = quality ? `/${quality}` : '';

  return `${baseUrl}/stream/${storageKey}${qualityParam}/playlist.${formatExtension}`;
};

/**
 * Range 헤더 파싱
 */
export const parseRangeHeader = (
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number; length: number } | null => {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : fileSize - 1;

  if (start >= fileSize || end >= fileSize || start > end) {
    return null;
  }

  return {
    start,
    end,
    length: end - start + 1,
  };
};

/**
 * Content-Type 헤더 생성
 */
export const getContentType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    m3u8: 'application/vnd.apple.mpegurl',
    mpd: 'application/dash+xml',
    ts: 'video/MP2T',
    m4s: 'video/iso.segment',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * 스트리밍 캐시 키 생성
 */
export const generateCacheKey = (
  storageKey: string,
  quality?: string,
  segment?: number,
): string => {
  const qualityParam = quality ? `_${quality}` : '';
  const segmentParam = segment !== undefined ? `_seg${segment}` : '';

  return `stream_${storageKey}${qualityParam}${segmentParam}`;
};

/**
 * HLS 플레이리스트 생성
 */
export const generateHLSPlaylist = (
  segments: Array<{
    duration: number;
    url: string;
    byteRange?: string;
  }>,
  isEndList: boolean = true,
): string => {
  const targetDuration = Math.ceil(
    Math.max(...segments.map((s) => s.duration)),
  );

  let playlist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '',
  ].join('\n');

  segments.forEach((segment) => {
    playlist += `#EXTINF:${segment.duration.toFixed(6)},\n`;
    if (segment.byteRange) {
      playlist += `#EXT-X-BYTERANGE:${segment.byteRange}\n`;
    }
    playlist += `${segment.url}\n`;
  });

  if (isEndList) {
    playlist += '#EXT-X-ENDLIST\n';
  }

  return playlist;
};

/**
 * 마스터 플레이리스트 생성 (적응형 비트레이트)
 */
export const generateMasterPlaylist = (
  baseUrl: string,
  storageKey: string,
): string => {
  const qualities = STREAMING_CONFIG.adaptiveBitrate.qualities;

  let playlist = ['#EXTM3U', '#EXT-X-VERSION:3', ''].join('\n');

  qualities.forEach((quality) => {
    const playlistUrl = generateStreamingUrl(
      baseUrl,
      storageKey,
      'hls',
      quality.name,
    );

    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth}`;
    playlist += `,RESOLUTION=${quality.resolution}`;
    playlist += `,CODECS="avc1.42c01e,mp4a.40.2"\n`;
    playlist += `${playlistUrl}\n`;
  });

  return playlist;
};

/**
 * 스트리밍 설정 검증
 */
export const validateStreamingConfig = (): void => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // CDN URL 검증
  if (STREAMING_CONFIG.cdn.enabled && !STREAMING_CONFIG.cdn.baseUrl) {
    console.warn('Warning: CDN is enabled but base URL is not configured');
  }

  // 세그멘테이션 디렉토리 생성
  const fs = require('fs');
  const tempDir = STREAMING_CONFIG.segmentation.tempDirectory;

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (error) {
    console.warn(
      `Warning: Could not create streaming temp directory: ${tempDir}`,
    );
  }

  console.log('✅ Streaming Configuration validated');
  console.log(
    `   - Adaptive bitrate: ${STREAMING_CONFIG.adaptiveBitrate.enabled ? 'enabled' : 'disabled'}`,
  );
  console.log(
    `   - CDN: ${STREAMING_CONFIG.cdn.enabled ? 'enabled' : 'disabled'}`,
  );
  console.log(
    `   - Max concurrent streams: ${STREAMING_CONFIG.bandwidth.throttling.maxConcurrentStreams}`,
  );
  console.log(
    `   - Segment duration: ${STREAMING_CONFIG.adaptiveBitrate.segmentDuration}s`,
  );
  console.log(
    `   - Supported qualities: ${STREAMING_CONFIG.adaptiveBitrate.qualities.map((q) => q.name).join(', ')}`,
  );
};

/**
 * 스트리밍 메트릭 계산
 */
export const calculateStreamingMetrics = (
  startTime: Date,
  endTime: Date,
  bytesTransferred: number,
  qualityChanges: number,
  bufferingEvents: number,
) => {
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // 초
  const averageBitrate = (bytesTransferred * 8) / duration; // bps
  const bufferingRatio = bufferingEvents / (duration / 60); // 분당 버퍼링 횟수

  return {
    duration,
    bytesTransferred,
    averageBitrate,
    averageBitrateMbps: averageBitrate / 1000000,
    qualityChanges,
    bufferingEvents,
    bufferingRatio,
    efficiency: Math.max(
      0,
      1 - (bufferingEvents * 0.1 + qualityChanges * 0.05),
    ), // 0-1
  };
};
