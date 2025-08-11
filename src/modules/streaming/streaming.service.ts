import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  detectDeviceType,
  generateCacheKey,
  generateHLSPlaylist,
  generateStreamingUrl,
  getBandwidthQualityMapping,
  getContentType,
  parseRangeHeader,
  STREAMING_CONFIG,
} from '../../config/streaming.config';
import { RedisService } from '../cache/redis.service';
import { StorageService } from '../storage/storage.service';
import {
  VideoProcessing,
  VideoProcessingStatus,
} from '../video-processing/video-processing.entity';
import {
  DeviceType,
  StreamingSession,
  StreamingSessionStatus,
} from './streaming-session.entity';

interface StreamChunk {
  start: number;
  end: number;
  data: Buffer;
  contentType: string;
  totalSize: number;
}

interface PlaylistInfo {
  content: string;
  contentType: string;
  cacheKey: string;
  duration?: number;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly qualityMapping = getBandwidthQualityMapping();

  constructor(
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
    @InjectRepository(VideoProcessing)
    private readonly videoProcessingRepository: Repository<VideoProcessing>,
    @InjectRepository(StreamingSession)
    private readonly streamingSessionRepository: Repository<StreamingSession>,
  ) {
    // 세션 정리 작업 (5분마다)
    setInterval(
      () => {
        this.cleanupInactiveSessions();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * HTTP Range 요청으로 스트리밍 청크 조회
   */
  async getStreamingChunk(
    storageKey: string,
    rangeHeader?: string,
    userAgent?: string,
  ): Promise<StreamChunk> {
    try {
      // 파일 메타데이터 조회
      const fileInfo = await this.storageService.getFileInfo(storageKey);
      if (!fileInfo) {
        throw new NotFoundException(`File not found: ${storageKey}`);
      }

      const totalSize = fileInfo.size;
      let start = 0;
      let end = totalSize - 1;

      // Range 헤더 파싱
      if (rangeHeader) {
        const range = parseRangeHeader(rangeHeader, totalSize);
        if (range) {
          start = range.start;
          end = range.end;
        }
      }

      // 최적화된 청크 크기 결정
      const deviceType = userAgent ? detectDeviceType(userAgent) : 'desktop';
      const chunkSize = this.getOptimalChunkSize(end - start + 1, deviceType);

      // 실제 종료 지점 조정
      end = Math.min(start + chunkSize - 1, end);

      // 스토리지에서 데이터 조회
      const data = await this.getFileChunk(storageKey, start, end);

      return {
        start,
        end,
        data,
        contentType: this.getContentTypeFromKey(storageKey),
        totalSize,
      };
    } catch (error) {
      this.logger.error(
        `Streaming chunk retrieval failed: ${storageKey} - ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * HLS 마스터 플레이리스트 생성
   */
  async generateMasterHLSPlaylist(
    storageKey: string,
    baseUrl: string,
  ): Promise<PlaylistInfo> {
    const cacheKey = generateCacheKey(storageKey, 'master');

    // 캐시에서 확인
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return {
        content: cached,
        contentType: 'application/vnd.apple.mpegurl',
        cacheKey,
      };
    }

    // 비디오 프로세싱 정보 조회
    const videoProcessing =
      await this.findVideoProcessingByStorageKey(storageKey);
    const availableQualities = this.getAvailableQualities(videoProcessing);

    // 마스터 플레이리스트 생성
    const playlist = this.createMasterPlaylist(
      baseUrl,
      storageKey,
      availableQualities,
    );

    // 캐시에 저장 (30초)
    await this.redisService.set(
      cacheKey,
      playlist,
      STREAMING_CONFIG.cdn.cacheStrategies.playlists.maxAge,
    );

    return {
      content: playlist,
      contentType: 'application/vnd.apple.mpegurl',
      cacheKey,
    };
  }

  /**
   * 품질별 HLS 플레이리스트 생성
   */
  async generateQualityHLSPlaylist(
    storageKey: string,
    quality: string,
    baseUrl: string,
  ): Promise<PlaylistInfo> {
    const cacheKey = generateCacheKey(storageKey, quality);

    // 캐시에서 확인
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return {
        content: cached,
        contentType: 'application/vnd.apple.mpegurl',
        cacheKey,
      };
    }

    // 비디오 프로세싱 정보 조회
    const videoProcessing =
      await this.findVideoProcessingByStorageKey(storageKey);
    if (
      !videoProcessing ||
      videoProcessing.status !== VideoProcessingStatus.COMPLETED
    ) {
      throw new NotFoundException(
        `Processed video not found for quality: ${quality}`,
      );
    }

    // 품질별 메타데이터 확인
    const qualityMetadata = videoProcessing.outputMetadata?.[quality];
    if (!qualityMetadata) {
      throw new NotFoundException(`Quality not available: ${quality}`);
    }

    // 세그먼트 정보 생성
    const segments = await this.generateSegments(
      qualityMetadata.storageKey,
      qualityMetadata.duration,
      baseUrl,
    );

    // 플레이리스트 생성
    const playlist = generateHLSPlaylist(segments, true);

    // 캐시에 저장
    await this.redisService.set(
      cacheKey,
      playlist,
      STREAMING_CONFIG.cdn.cacheStrategies.playlists.maxAge,
    );

    return {
      content: playlist,
      contentType: 'application/vnd.apple.mpegurl',
      cacheKey,
      duration: qualityMetadata.duration,
    };
  }

  /**
   * 스트리밍 세션 시작
   */
  async startStreamingSession(
    userId: number,
    storageKey: string,
    quality: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const deviceTypeStr = userAgent ? detectDeviceType(userAgent) : 'desktop';
    const deviceType = this.mapDeviceType(deviceTypeStr);

    // 동시 스트림 수 확인
    const activeUserSessions = await this.streamingSessionRepository.count({
      where: {
        userId,
        status: StreamingSessionStatus.ACTIVE,
      },
    });

    if (
      activeUserSessions >=
      STREAMING_CONFIG.bandwidth.throttling.rateLimitPerUser
    ) {
      throw new Error('Maximum concurrent streams exceeded for user');
    }

    // 세션 엔티티 생성
    const session = this.streamingSessionRepository.create({
      sessionId,
      userId,
      storageKey,
      currentQuality: quality,
      initialQuality: quality,
      deviceType,
      userAgent,
      ipAddress,
      status: StreamingSessionStatus.ACTIVE,
      bytesTransferred: 0,
      qualityChanges: 0,
      bufferingEvents: 0,
      totalBufferingTime: 0,
      playbackTime: 0,
      averageBitrate: 0,
    });

    session.startSession();
    const savedSession = await this.streamingSessionRepository.save(session);

    // 분석 이벤트 기록
    await this.trackStreamingEvent(sessionId, 'stream_start', {
      quality,
      deviceType: deviceTypeStr,
    });

    this.logger.log(
      `Streaming session started: ${sessionId} for user ${userId}`,
    );
    return sessionId;
  }

  /**
   * 스트리밍 세션 종료
   */
  async endStreamingSession(sessionId: string): Promise<void> {
    const session = await this.streamingSessionRepository.findOne({
      where: { sessionId },
    });

    if (!session) {
      return;
    }

    // 세션 종료 처리
    session.endSession();

    // 최종 분석 이벤트 기록
    await this.trackStreamingEvent(sessionId, 'stream_end', {
      duration: session.getSessionDuration(),
      bytesTransferred: session.bytesTransferred,
      qualityChanges: session.qualityChanges,
      bufferingEvents: session.bufferingEvents,
    });

    // 데이터베이스 업데이트
    await this.streamingSessionRepository.save(session);

    this.logger.log(`Streaming session ended: ${sessionId}`);
  }

  /**
   * 품질 변경
   */
  async changeStreamingQuality(
    sessionId: string,
    newQuality: string,
  ): Promise<void> {
    const session = await this.streamingSessionRepository.findOne({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Streaming session not found: ${sessionId}`);
    }

    const oldQuality = session.currentQuality;

    // 품질 변경 기록
    session.recordQualityChange(oldQuality, newQuality, 'user_request');

    // 분석 이벤트 기록
    await this.trackStreamingEvent(sessionId, 'quality_change', {
      from: oldQuality,
      to: newQuality,
      reason: 'user_request',
    });

    // 데이터베이스 업데이트
    await this.streamingSessionRepository.save(session);

    this.logger.debug(
      `Quality changed for session ${sessionId}: ${oldQuality} -> ${newQuality}`,
    );
  }

  /**
   * 버퍼링 이벤트 기록
   */
  async recordBufferingEvent(
    sessionId: string,
    duration: number,
  ): Promise<void> {
    const session = await this.streamingSessionRepository.findOne({
      where: { sessionId },
    });

    if (!session) {
      return;
    }

    // 버퍼링 이벤트 기록
    session.recordBufferingEvent(duration, 0); // position은 현재 구현에서 0으로 설정

    // 자동 품질 다운그레이드 체크
    if (
      session.bufferingEvents >=
      STREAMING_CONFIG.buffering.qualityDowngradeThreshold
    ) {
      const currentQualityIndex =
        STREAMING_CONFIG.adaptiveBitrate.qualities.findIndex(
          (q) => q.name === session.currentQuality,
        );

      if (currentQualityIndex > 0) {
        const oldQuality =
          STREAMING_CONFIG.adaptiveBitrate.qualities[currentQualityIndex].name;
        const newQuality =
          STREAMING_CONFIG.adaptiveBitrate.qualities[currentQualityIndex - 1]
            .name;

        // 품질 변경 기록
        session.recordQualityChange(oldQuality, newQuality, 'auto_downgrade');

        // 버퍼링 카운터 리셋
        session.bufferingEvents = 0;

        await this.trackStreamingEvent(sessionId, 'quality_change', {
          from: oldQuality,
          to: newQuality,
          reason: 'auto_downgrade',
        });
      }
    }

    // 분석 이벤트 기록
    await this.trackStreamingEvent(sessionId, 'buffering', {
      duration,
      bufferingCount: session.bufferingEvents,
    });

    // 데이터베이스 업데이트
    await this.streamingSessionRepository.save(session);
  }

  /**
   * 대역폭 기반 품질 추천
   */
  getRecommendedQuality(
    estimatedBandwidth: number,
    deviceType: keyof typeof STREAMING_CONFIG.deviceOptimization,
  ): string {
    const deviceConfig = STREAMING_CONFIG.deviceOptimization[deviceType];
    const availableQualities =
      STREAMING_CONFIG.adaptiveBitrate.qualities.filter(
        (q) => q.name <= deviceConfig.maxQuality,
      );

    // 대역폭에 맞는 최고 품질 선택
    for (let i = availableQualities.length - 1; i >= 0; i--) {
      const quality = availableQualities[i];
      if (estimatedBandwidth >= quality.bandwidth * 1.2) {
        // 20% 여유분
        return quality.name;
      }
    }

    return availableQualities[0].name; // 가장 낮은 품질
  }

  /**
   * 스트리밍 통계 조회
   */
  async getStreamingStats(userId?: number): Promise<{
    activeSessions: number;
    totalBytesTransferred: number;
    averageQualityChanges: number;
    averageBufferingEvents: number;
    popularQualities: { quality: string; count: number }[];
    deviceDistribution: { device: string; count: number }[];
  }> {
    const queryBuilder = this.streamingSessionRepository
      .createQueryBuilder('session')
      .where('session.status = :status', {
        status: StreamingSessionStatus.ACTIVE,
      });

    if (userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId });
    }

    const activeSessions = await queryBuilder.getMany();

    const totalBytes = activeSessions.reduce(
      (sum, s) => sum + s.bytesTransferred,
      0,
    );
    const avgQualityChanges =
      activeSessions.length > 0
        ? activeSessions.reduce((sum, s) => sum + s.qualityChanges, 0) /
          activeSessions.length
        : 0;
    const avgBufferingEvents =
      activeSessions.length > 0
        ? activeSessions.reduce((sum, s) => sum + s.bufferingEvents, 0) /
          activeSessions.length
        : 0;

    // 품질 분포
    const qualityCount = activeSessions.reduce(
      (acc, s) => {
        acc[s.currentQuality] = (acc[s.currentQuality] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const popularQualities = Object.entries(qualityCount)
      .map(([quality, count]) => ({ quality, count }))
      .sort((a, b) => b.count - a.count);

    // 디바이스 분포
    const deviceCount = activeSessions.reduce(
      (acc, s) => {
        const deviceStr = this.deviceTypeToString(s.deviceType);
        acc[deviceStr] = (acc[deviceStr] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const deviceDistribution = Object.entries(deviceCount)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    return {
      activeSessions: activeSessions.length,
      totalBytesTransferred: totalBytes,
      averageQualityChanges: Math.round(avgQualityChanges * 100) / 100,
      averageBufferingEvents: Math.round(avgBufferingEvents * 100) / 100,
      popularQualities,
      deviceDistribution,
    };
  }

  /**
   * 비활성 세션 정리
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30분 전

    const inactiveSessions = await this.streamingSessionRepository.find({
      where: {
        status: StreamingSessionStatus.ACTIVE,
        lastActivityAt: {
          $lt: cutoffTime,
        } as any,
      },
    });

    for (const session of inactiveSessions) {
      await this.endStreamingSession(session.sessionId);
    }

    this.logger.debug(
      `Cleaned up ${inactiveSessions.length} inactive streaming sessions`,
    );
  }

  /**
   * 최적 청크 크기 계산
   */
  private getOptimalChunkSize(
    requestedSize: number,
    deviceType: string,
  ): number {
    const baseSize = STREAMING_CONFIG.range.chunkSize;
    const maxSize = STREAMING_CONFIG.range.maxChunkSize;
    const minSize = STREAMING_CONFIG.range.minChunkSize;

    // 디바이스별 조정
    let multiplier = 1;
    switch (deviceType) {
      case 'mobile':
        multiplier = 0.5;
        break;
      case 'tablet':
        multiplier = 0.75;
        break;
      case 'desktop':
        multiplier = 1.0;
        break;
    }

    const targetSize = Math.min(requestedSize, baseSize * multiplier);
    return Math.max(minSize, Math.min(maxSize, targetSize));
  }

  /**
   * 스토리지 키에서 Content-Type 결정
   */
  private getContentTypeFromKey(storageKey: string): string {
    const extension = storageKey.split('.').pop()?.toLowerCase() || '';
    return getContentType(extension);
  }

  /**
   * 파일 청크 조회
   */
  private async getFileChunk(
    storageKey: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    // StorageService를 통해 Range 요청으로 파일 데이터 조회
    // 실제 구현에서는 S3 Range 요청 사용
    const downloadUrl = await this.storageService.getDownloadUrl(
      storageKey,
      3600,
    );

    // TODO: HTTP Range 요청으로 실제 데이터 다운로드 구현
    // const response = await fetch(downloadUrl, {
    //   headers: {
    //     'Range': `bytes=${start}-${end}`,
    //   },
    // });
    // return Buffer.from(await response.arrayBuffer());

    // 임시 구현: 더미 데이터 반환
    const chunkSize = end - start + 1;
    return Buffer.alloc(chunkSize, 0);
  }

  /**
   * 비디오 프로세싱 정보 조회
   */
  private async findVideoProcessingByStorageKey(
    storageKey: string,
  ): Promise<VideoProcessing | null> {
    return await this.videoProcessingRepository.findOne({
      where: { inputStorageKey: storageKey },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 사용 가능한 품질 목록 조회
   */
  private getAvailableQualities(
    videoProcessing: VideoProcessing | null,
  ): Array<{ name: string; bandwidth: number; resolution: string }> {
    if (!videoProcessing || !videoProcessing.outputMetadata) {
      // 기본 품질만 제공
      return [STREAMING_CONFIG.adaptiveBitrate.qualities[0]];
    }

    return STREAMING_CONFIG.adaptiveBitrate.qualities.filter(
      (quality) => videoProcessing.outputMetadata![quality.name],
    );
  }

  /**
   * 마스터 플레이리스트 생성
   */
  private createMasterPlaylist(
    baseUrl: string,
    storageKey: string,
    availableQualities: Array<{
      name: string;
      bandwidth: number;
      resolution: string;
    }>,
  ): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    availableQualities.forEach((quality) => {
      const qualityPlaylistUrl = generateStreamingUrl(
        baseUrl,
        storageKey,
        'hls',
        quality.name,
      );

      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth}`;
      playlist += `,RESOLUTION=${quality.resolution}`;
      playlist += `,CODECS="avc1.42c01e,mp4a.40.2"\n`;
      playlist += `${qualityPlaylistUrl}\n`;
    });

    return playlist;
  }

  /**
   * 세그먼트 정보 생성
   */
  private async generateSegments(
    storageKey: string,
    duration: number,
    baseUrl: string,
  ): Promise<Array<{ duration: number; url: string }>> {
    const segmentDuration = STREAMING_CONFIG.adaptiveBitrate.segmentDuration;
    const segmentCount = Math.ceil(duration / segmentDuration);
    const segments: Array<{ duration: number; url: string }> = [];

    for (let i = 0; i < segmentCount; i++) {
      const segmentStart = i * segmentDuration;
      const segmentEnd = Math.min((i + 1) * segmentDuration, duration);
      const actualDuration = segmentEnd - segmentStart;

      const segmentUrl = `${baseUrl}/stream/${storageKey}/segment/${i}.ts`;

      segments.push({
        duration: actualDuration,
        url: segmentUrl,
      });
    }

    return segments;
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 스트리밍 이벤트 추적
   */
  private async trackStreamingEvent(
    sessionId: string,
    event: string,
    data: any,
  ): Promise<void> {
    if (!STREAMING_CONFIG.analytics.enabled) {
      return;
    }

    // 캐시를 통해 분석 데이터 저장 (실제 구현에서는 분석 서비스로 전송)
    const analyticsKey = `streaming_event_${sessionId}_${Date.now()}`;
    const eventData = {
      sessionId,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    await this.redisService.set(analyticsKey, JSON.stringify(eventData), 86400); // 24시간

    this.logger.debug(
      `Streaming event tracked: ${event} for session ${sessionId}`,
    );
  }

  /**
   * 스트리밍 세션 업데이트 (바이트 전송량)
   */
  async updateSessionBytesTransferred(
    sessionId: string,
    bytes: number,
  ): Promise<void> {
    const session = await this.streamingSessionRepository.findOne({
      where: { sessionId },
    });

    if (session) {
      session.updateBytesTransferred(bytes);
      await this.streamingSessionRepository.save(session);
    }
  }

  /**
   * 활성 세션 조회
   */
  async getActiveSession(sessionId: string): Promise<StreamingSession | null> {
    return await this.streamingSessionRepository.findOne({
      where: {
        sessionId,
        status: StreamingSessionStatus.ACTIVE,
      },
    });
  }

  /**
   * 사용자의 활성 세션 목록
   */
  async getUserActiveSessions(userId: number): Promise<StreamingSession[]> {
    return await this.streamingSessionRepository.find({
      where: {
        userId,
        status: StreamingSessionStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 디바이스 타입 매핑 (문자열 → 열거형)
   */
  private mapDeviceType(deviceTypeStr: string): DeviceType {
    switch (deviceTypeStr.toLowerCase()) {
      case 'mobile':
        return DeviceType.MOBILE;
      case 'tablet':
        return DeviceType.TABLET;
      case 'desktop':
        return DeviceType.DESKTOP;
      case 'tv':
        return DeviceType.TV;
      default:
        return DeviceType.UNKNOWN;
    }
  }

  /**
   * 디바이스 타입 매핑 (열거형 → 문자열)
   */
  private deviceTypeToString(deviceType: DeviceType): string {
    switch (deviceType) {
      case DeviceType.MOBILE:
        return 'mobile';
      case DeviceType.TABLET:
        return 'tablet';
      case DeviceType.DESKTOP:
        return 'desktop';
      case DeviceType.TV:
        return 'tv';
      default:
        return 'unknown';
    }
  }
}
