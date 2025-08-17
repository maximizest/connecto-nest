import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Cloudflare Stream API 응답 타입
 */
interface CloudflareStreamResponse {
  result: {
    uid: string;
    preview: string;
    thumbnail: string;
    readyToStream: boolean;
    status: {
      state: 'queued' | 'downloading' | 'processing' | 'ready' | 'error';
      pctComplete?: number;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    meta: {
      name?: string;
    };
    created: string;
    modified: string;
    size: number;
    duration?: number;
    input: {
      width?: number;
      height?: number;
    };
    playback: {
      hls: string;
      dash: string;
    };
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

/**
 * Cloudflare Images API 응답 타입
 */
interface CloudflareImagesResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

/**
 * 미디어 업로드 결과
 */
export interface MediaUploadResult {
  id: string;
  type: 'video' | 'image';
  publicUrl: string;
  thumbnailUrl?: string;
  variants?: {
    [key: string]: string;
  };
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  };
  status: 'processing' | 'ready' | 'error';
  streamingUrls?: {
    hls?: string;
    dash?: string;
  };
}

@Injectable()
export class CloudflareMediaService {
  private readonly logger = new Logger(CloudflareMediaService.name);
  private readonly accountId: string;
  private readonly streamApiToken: string;
  private readonly imagesApiToken: string;
  private readonly imagesAccountHash: string;
  
  // R2 credentials (shared with storage module)
  private readonly r2AccessKeyId: string;
  private readonly r2SecretAccessKey: string;

  constructor() {
    // Cloudflare Account ID (R2 endpoint에서 추출)
    // https://81128865768e72852c169b9118f8732e.r2.cloudflarestorage.com
    // 위 URL에서 81128865768e72852c169b9118f8732e가 Account ID
    const endpointMatch = process.env.STORAGE_ENDPOINT?.match(/https:\/\/([a-f0-9]{32})/);
    this.accountId = endpointMatch?.[1] || '81128865768e72852c169b9118f8732e';
    
    // 모든 서비스에 동일한 Cloudflare 통합 키 사용
    // STORAGE_ACCESS_KEY_ID와 STORAGE_SECRET_ACCESS_KEY를 재사용
    this.streamApiToken = process.env.STORAGE_SECRET_ACCESS_KEY || '';
    this.imagesApiToken = process.env.STORAGE_SECRET_ACCESS_KEY || '';
    this.imagesAccountHash = this.accountId;  // Account ID를 hash로 사용
    
    // R2 credentials (동일한 키 사용)
    this.r2AccessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
    this.r2SecretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

    if (!this.r2SecretAccessKey) {
      this.logger.warn('STORAGE_SECRET_ACCESS_KEY not configured. Cloudflare services will not work.');
    } else {
      this.logger.log(
        `Cloudflare services initialized:\n` +
        `  Account ID: ${this.accountId.substring(0, 8)}...\n` +
        `  Using unified Cloudflare API key from STORAGE_SECRET_ACCESS_KEY`
      );
    }
  }

  /**
   * 비디오를 Cloudflare Stream에 업로드
   */
  async uploadVideo(
    videoUrl: string,
    metadata?: {
      name?: string;
      requireSignedURLs?: boolean;
      allowedOrigins?: string[];
      thumbnailTimestampPct?: number;
      watermark?: string;
    },
  ): Promise<MediaUploadResult> {
    try {
      const response = await axios.post<CloudflareStreamResponse>(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/copy`,
        {
          url: videoUrl,
          meta: metadata?.name ? { name: metadata.name } : undefined,
          requireSignedURLs: metadata?.requireSignedURLs || false,
          allowedOrigins: metadata?.allowedOrigins,
          thumbnailTimestampPct: metadata?.thumbnailTimestampPct || 0.5,
          watermark: metadata?.watermark,
        },
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const video = response.data.result;

      return {
        id: video.uid,
        type: 'video',
        publicUrl: `https://customer-${this.imagesAccountHash}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`,
        thumbnailUrl: video.thumbnail.replace(
          'thumbnail.jpg',
          'thumbnail.jpg?time=10s&width=320',
        ),
        status: video.readyToStream ? 'ready' : 'processing',
        streamingUrls: {
          hls: video.playback.hls,
          dash: video.playback.dash,
        },
        metadata: {
          width: video.input.width,
          height: video.input.height,
          duration: video.duration,
          size: video.size,
        },
      };
    } catch (error) {
      this.logger.error('Failed to upload video to Cloudflare Stream', error);
      throw error;
    }
  }

  /**
   * 이미지를 Cloudflare Images에 업로드
   */
  async uploadImage(
    imageUrl: string,
    metadata?: {
      id?: string;
      filename?: string;
      requireSignedURLs?: boolean;
    },
  ): Promise<MediaUploadResult> {
    try {
      const formData = new FormData();
      formData.append('url', imageUrl);
      
      if (metadata?.id) {
        formData.append('id', metadata.id);
      }
      if (metadata?.filename) {
        formData.append('metadata', JSON.stringify({ filename: metadata.filename }));
      }
      formData.append('requireSignedURLs', String(metadata?.requireSignedURLs || false));

      const response = await axios.post<CloudflareImagesResponse>(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.imagesApiToken}`,
          },
        },
      );

      const image = response.data.result;
      const baseUrl = `https://imagedelivery.net/${this.imagesAccountHash}/${image.id}`;

      return {
        id: image.id,
        type: 'image',
        publicUrl: `${baseUrl}/public`,
        thumbnailUrl: `${baseUrl}/thumbnail`,
        variants: {
          public: `${baseUrl}/public`,
          thumbnail: `${baseUrl}/thumbnail`,
          small: `${baseUrl}/small`,
          medium: `${baseUrl}/medium`,
          large: `${baseUrl}/large`,
        },
        status: 'ready',
      };
    } catch (error) {
      this.logger.error('Failed to upload image to Cloudflare Images', error);
      throw error;
    }
  }

  /**
   * Direct Creator Upload을 위한 URL 생성 (비디오)
   */
  async generateVideoUploadUrl(
    maxDurationSeconds?: number,
    requireSignedURLs?: boolean,
  ): Promise<{
    uploadUrl: string;
    uid: string;
  }> {
    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/direct_upload`,
        {
          maxDurationSeconds: maxDurationSeconds || 3600,
          requireSignedURLs: requireSignedURLs || false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        uploadUrl: response.data.result.uploadURL,
        uid: response.data.result.uid,
      };
    } catch (error) {
      this.logger.error('Failed to generate video upload URL', error);
      throw error;
    }
  }

  /**
   * Direct Creator Upload을 위한 URL 생성 (이미지)
   */
  async generateImageUploadUrl(
    requireSignedURLs?: boolean,
  ): Promise<{
    uploadUrl: string;
    id: string;
  }> {
    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v2/direct_upload`,
        {
          requireSignedURLs: requireSignedURLs || false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.imagesApiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        uploadUrl: response.data.result.uploadURL,
        id: response.data.result.id,
      };
    } catch (error) {
      this.logger.error('Failed to generate image upload URL', error);
      throw error;
    }
  }

  /**
   * 비디오 상태 조회
   */
  async getVideoStatus(videoId: string): Promise<{
    ready: boolean;
    status: string;
    percentComplete?: number;
    errorReason?: string;
  }> {
    try {
      const response = await axios.get<CloudflareStreamResponse>(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
          },
        },
      );

      const video = response.data.result;

      return {
        ready: video.readyToStream,
        status: video.status.state,
        percentComplete: video.status.pctComplete,
        errorReason: video.status.errorReasonText,
      };
    } catch (error) {
      this.logger.error(`Failed to get video status for ${videoId}`, error);
      throw error;
    }
  }

  /**
   * 비디오 삭제
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
          },
        },
      );

      this.logger.log(`Video ${videoId} deleted from Cloudflare Stream`);
    } catch (error) {
      this.logger.error(`Failed to delete video ${videoId}`, error);
      throw error;
    }
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1/${imageId}`,
        {
          headers: {
            Authorization: `Bearer ${this.imagesApiToken}`,
          },
        },
      );

      this.logger.log(`Image ${imageId} deleted from Cloudflare Images`);
    } catch (error) {
      this.logger.error(`Failed to delete image ${imageId}`, error);
      throw error;
    }
  }

  /**
   * 비디오 썸네일 URL 생성
   */
  generateVideoThumbnailUrl(
    videoId: string,
    options?: {
      time?: string; // e.g., '10s', '50%'
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill';
    },
  ): string {
    const params = new URLSearchParams();
    
    if (options?.time) params.append('time', options.time);
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.fit) params.append('fit', options.fit);

    const queryString = params.toString();
    return `https://customer-${this.imagesAccountHash}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg${
      queryString ? `?${queryString}` : ''
    }`;
  }

  /**
   * 이미지 변형 URL 생성
   */
  generateImageVariantUrl(
    imageId: string,
    variant: 'public' | 'thumbnail' | 'small' | 'medium' | 'large' | string,
  ): string {
    return `https://imagedelivery.net/${this.imagesAccountHash}/${imageId}/${variant}`;
  }

  /**
   * 서명된 URL 생성 (비디오)
   */
  async generateSignedVideoUrl(
    videoId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    // Cloudflare Stream의 서명된 URL 생성 로직
    // 실제 구현은 Cloudflare API 문서 참조
    const token = await this.generateVideoToken(videoId, expiresIn);
    return `https://customer-${this.imagesAccountHash}.cloudflarestream.com/${token}/manifest/video.m3u8`;
  }

  /**
   * 비디오 토큰 생성 (private method)
   */
  private async generateVideoToken(
    videoId: string,
    expiresIn: number,
  ): Promise<string> {
    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoId}/token`,
        {
          exp: Math.floor(Date.now() / 1000) + expiresIn,
        },
        {
          headers: {
            Authorization: `Bearer ${this.streamApiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.result.token;
    } catch (error) {
      this.logger.error(`Failed to generate token for video ${videoId}`, error);
      throw error;
    }
  }

  /**
   * 미디어 타입 판별
   */
  isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * 지원되는 비디오 형식 확인
   */
  isSupportedVideoFormat(mimeType: string): boolean {
    const supportedFormats = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
    ];
    return supportedFormats.includes(mimeType);
  }

  /**
   * 지원되는 이미지 형식 확인
   */
  isSupportedImageFormat(mimeType: string): boolean {
    const supportedFormats = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    return supportedFormats.includes(mimeType);
  }

  /**
   * Cloudflare Stream 서비스 사용 가능 여부
   */
  isStreamAvailable(): boolean {
    return !!(this.accountId && this.streamApiToken);
  }

  /**
   * Cloudflare Images 서비스 사용 가능 여부
   */
  isImagesAvailable(): boolean {
    return !!(this.accountId && this.imagesApiToken);
  }

  /**
   * R2 스토리지 사용 가능 여부
   */
  isR2Available(): boolean {
    return !!(this.r2AccessKeyId && this.r2SecretAccessKey);
  }

  /**
   * 서비스 상태 조회
   */
  getServiceStatus(): {
    r2: boolean;
    stream: boolean;
    images: boolean;
  } {
    return {
      r2: this.isR2Available(),
      stream: this.isStreamAvailable(),
      images: this.isImagesAvailable(),
    };
  }
}