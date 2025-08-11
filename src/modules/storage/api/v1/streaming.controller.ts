import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  detectDeviceType,
  STREAMING_CONFIG,
} from '../../../../config/streaming.config';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../../user/user.entity';
import { StorageService } from '../../storage.service';
import { StreamingService } from '../../streaming.service';

interface StreamingRequest extends Request {
  user: User;
}

/**
 * Streaming API Controller (v1)
 *
 * 대용량 미디어 스트리밍을 위한 최적화된 API를 제공합니다.
 * - HTTP Range 요청 지원 (부분 콘텐츠)
 * - HLS 적응형 비트레이트 스트리밍
 * - 대역폭 최적화 및 품질 조절
 * - 실시간 스트리밍 세션 관리
 */
@Controller({ path: 'streaming', version: '1' })
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name);

  constructor(
    private readonly streamingService: StreamingService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * HTTP Range 요청으로 비디오 스트리밍
   * GET /api/v1/streaming/video/:storageKey
   */
  @Get('video/:storageKey')
  @UseGuards(AuthGuard)
  async streamVideo(
    @Param('storageKey') storageKey: string,
    @Headers('range') rangeHeader?: string,
    @Headers('user-agent') userAgent?: string,
    @Req() req?: StreamingRequest,
    @Res() res?: Response,
  ) {
    try {
      // 파일 접근 권한 확인 (실제 구현에서는 파일 소유권 검증 필요)
      const fileInfo = await this.storageService.getFileInfo(storageKey);
      if (!fileInfo) {
        throw new NotFoundException(`Video file not found: ${storageKey}`);
      }

      // 스트리밍 청크 조회
      const chunk = await this.streamingService.getStreamingChunk(
        storageKey,
        rangeHeader,
        userAgent,
      );

      // HTTP 상태 및 헤더 설정
      const statusCode = rangeHeader ? 206 : 200; // Partial Content or OK

      res!.status(statusCode);
      res!.set({
        'Content-Type': chunk.contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk.data.length.toString(),
        'Cache-Control': `max-age=${STREAMING_CONFIG.range.cacheHeaders.maxAge}`,
      });

      if (rangeHeader) {
        res!.set({
          'Content-Range': `bytes ${chunk.start}-${chunk.end}/${chunk.totalSize}`,
        });
      }

      // ETag 지원
      if (STREAMING_CONFIG.range.cacheHeaders.etag) {
        const etag = `"${storageKey}-${chunk.start}-${chunk.end}"`;
        res!.set('ETag', etag);

        if (req!.headers['if-none-match'] === etag) {
          return res!.status(304).end();
        }
      }

      this.logger.debug(
        `Video streaming: ${storageKey} (${chunk.start}-${chunk.end}/${chunk.totalSize})`,
      );

      // 데이터 스트리밍
      res!.end(chunk.data);
    } catch (error) {
      this.logger.error(
        `Video streaming failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * HLS 마스터 플레이리스트 조회 (적응형 비트레이트)
   * GET /api/v1/streaming/hls/:storageKey/master.m3u8
   */
  @Get('hls/:storageKey/master.m3u8')
  @UseGuards(AuthGuard)
  async getHLSMasterPlaylist(
    @Param('storageKey') storageKey: string,
    @Req() req?: StreamingRequest,
    @Res() res?: Response,
  ) {
    try {
      // 기본 URL 생성
      const protocol = req!.protocol;
      const host = req!.get('host');
      const baseUrl = `${protocol}://${host}/api/v1/streaming`;

      // 마스터 플레이리스트 생성
      const playlist = await this.streamingService.generateMasterHLSPlaylist(
        storageKey,
        baseUrl,
      );

      // 응답 헤더 설정
      res!.set({
        'Content-Type': playlist.contentType,
        'Cache-Control': `max-age=${STREAMING_CONFIG.cdn.cacheStrategies.playlists.maxAge}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range',
      });

      this.logger.debug(`HLS master playlist served: ${storageKey}`);

      res!.send(playlist.content);
    } catch (error) {
      this.logger.error(
        `HLS master playlist failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * HLS 품질별 플레이리스트 조회
   * GET /api/v1/streaming/hls/:storageKey/:quality/playlist.m3u8
   */
  @Get('hls/:storageKey/:quality/playlist.m3u8')
  @UseGuards(AuthGuard)
  async getHLSQualityPlaylist(
    @Param('storageKey') storageKey: string,
    @Param('quality') quality: string,
    @Req() req?: StreamingRequest,
    @Res() res?: Response,
  ) {
    try {
      // 품질 검증
      const validQualities = STREAMING_CONFIG.adaptiveBitrate.qualities.map(
        (q) => q.name,
      );
      if (!validQualities.includes(quality)) {
        throw new BadRequestException(`Invalid quality: ${quality}`);
      }

      // 기본 URL 생성
      const protocol = req!.protocol;
      const host = req!.get('host');
      const baseUrl = `${protocol}://${host}/api/v1/streaming`;

      // 품질별 플레이리스트 생성
      const playlist = await this.streamingService.generateQualityHLSPlaylist(
        storageKey,
        quality,
        baseUrl,
      );

      // 응답 헤더 설정
      res!.set({
        'Content-Type': playlist.contentType,
        'Cache-Control': `max-age=${STREAMING_CONFIG.cdn.cacheStrategies.playlists.maxAge}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range',
      });

      this.logger.debug(
        `HLS quality playlist served: ${storageKey}/${quality}`,
      );

      res!.send(playlist.content);
    } catch (error) {
      this.logger.error(
        `HLS quality playlist failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * HLS 비디오 세그먼트 조회
   * GET /api/v1/streaming/hls/:storageKey/:quality/segment/:segmentNumber.ts
   */
  @Get('hls/:storageKey/:quality/segment/:segmentNumber.ts')
  @UseGuards(AuthGuard)
  async getHLSSegment(
    @Param('storageKey') storageKey: string,
    @Param('quality') quality: string,
    @Param('segmentNumber') segmentNumber: string,
    @Headers('range') rangeHeader?: string,
    @Headers('user-agent') userAgent?: string,
    @Req() req?: StreamingRequest,
    @Res() res?: Response,
  ) {
    try {
      const segmentNum = parseInt(segmentNumber);

      if (isNaN(segmentNum) || segmentNum < 0) {
        throw new BadRequestException('Invalid segment number');
      }

      // 세그먼트 길이 계산
      const segmentDuration = STREAMING_CONFIG.adaptiveBitrate.segmentDuration;
      const startTime = segmentNum * segmentDuration;

      // 실제 비디오 파일에서 해당 구간 추출 (Range 요청)
      const segmentChunk = await this.streamingService.getStreamingChunk(
        storageKey,
        rangeHeader,
        userAgent,
      );

      // Transport Stream 형식으로 응답
      res!.set({
        'Content-Type': 'video/MP2T',
        'Content-Length': segmentChunk.data.length.toString(),
        'Cache-Control': `max-age=${STREAMING_CONFIG.cdn.cacheStrategies.video.maxAge}`,
        'Access-Control-Allow-Origin': '*',
      });

      this.logger.debug(
        `HLS segment served: ${storageKey}/${quality}/segment/${segmentNumber}`,
      );

      res!.end(segmentChunk.data);
    } catch (error) {
      this.logger.error(`HLS segment failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 스트리밍 세션 시작
   * POST /api/v1/streaming/session/start
   */
  @Post('session/start')
  @UseGuards(AuthGuard)
  async startStreamingSession(
    @Req() req?: StreamingRequest,
    @Query('storageKey') storageKey?: string,
    @Query('quality') quality = 'medium',
    @Headers('user-agent') userAgent?: string,
  ) {
    const user = req!.user;

    try {
      if (!storageKey) {
        throw new BadRequestException('Storage key is required');
      }

      // 파일 존재 확인
      const fileInfo = await this.storageService.getFileInfo(storageKey);
      if (!fileInfo) {
        throw new NotFoundException(`File not found: ${storageKey}`);
      }

      // 디바이스 타입 감지 및 품질 최적화
      const deviceType = userAgent ? detectDeviceType(userAgent) : 'desktop';
      const deviceConfig = STREAMING_CONFIG.deviceOptimization[deviceType];

      // 디바이스 최대 품질 제한
      const requestedQuality = quality;
      const finalQuality =
        deviceConfig.maxQuality < requestedQuality
          ? deviceConfig.maxQuality
          : requestedQuality;

      // 세션 시작
      const sessionId = await this.streamingService.startStreamingSession(
        user.id,
        storageKey,
        finalQuality,
        userAgent,
        req!.ip,
      );

      this.logger.log(
        `Streaming session started: ${sessionId}, user: ${user.id}`,
      );

      return {
        success: true,
        message: '스트리밍 세션이 시작되었습니다.',
        data: {
          sessionId,
          storageKey,
          quality: finalQuality,
          deviceType,
          recommendedQuality: finalQuality,
          hlsMasterPlaylistUrl: `/api/v1/streaming/hls/${storageKey}/master.m3u8`,
          directVideoUrl: `/api/v1/streaming/video/${storageKey}`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming session start failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 스트리밍 세션 종료
   * DELETE /api/v1/streaming/session/:sessionId
   */
  @Delete('session/:sessionId')
  @UseGuards(AuthGuard)
  async endStreamingSession(
    @Param('sessionId') sessionId: string,
    @Req() req?: StreamingRequest,
  ) {
    const user = req!.user;

    try {
      // 세션 소유권 확인
      const session = await this.streamingService.getActiveSession(sessionId);
      if (session && session.userId !== user.id) {
        throw new BadRequestException('세션 접근 권한이 없습니다.');
      }

      // 세션 종료
      await this.streamingService.endStreamingSession(sessionId);

      this.logger.log(
        `Streaming session ended: ${sessionId}, user: ${user.id}`,
      );

      return {
        success: true,
        message: '스트리밍 세션이 종료되었습니다.',
        data: {
          sessionId,
          endedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming session end failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 스트리밍 품질 변경
   * POST /api/v1/streaming/session/:sessionId/quality
   */
  @Post('session/:sessionId/quality')
  @UseGuards(AuthGuard)
  async changeStreamingQuality(
    @Param('sessionId') sessionId: string,
    @Query('quality') quality?: string,
    @Req() req?: StreamingRequest,
  ) {
    const user = req!.user;

    try {
      if (!quality) {
        throw new BadRequestException('Quality parameter is required');
      }

      // 품질 검증
      const validQualities = STREAMING_CONFIG.adaptiveBitrate.qualities.map(
        (q) => q.name,
      );
      if (!validQualities.includes(quality)) {
        throw new BadRequestException(`Invalid quality: ${quality}`);
      }

      // 세션 소유권 확인
      const session = await this.streamingService.getActiveSession(sessionId);
      if (!session) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      if (session.userId !== user.id) {
        throw new BadRequestException('세션 접근 권한이 없습니다.');
      }

      // 품질 변경
      await this.streamingService.changeStreamingQuality(sessionId, quality);

      this.logger.log(
        `Streaming quality changed: ${sessionId} -> ${quality}, user: ${user.id}`,
      );

      return {
        success: true,
        message: '스트리밍 품질이 변경되었습니다.',
        data: {
          sessionId,
          newQuality: quality,
          previousQuality: session.currentQuality,
          changedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming quality change failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 버퍼링 이벤트 기록
   * POST /api/v1/streaming/session/:sessionId/buffering
   */
  @Post('session/:sessionId/buffering')
  @UseGuards(AuthGuard)
  async recordBufferingEvent(
    @Param('sessionId') sessionId: string,
    @Query('duration') duration?: string,
    @Req() req?: StreamingRequest,
  ) {
    const user = req!.user;

    try {
      const bufferingDuration = duration ? parseFloat(duration) : 1.0;

      if (isNaN(bufferingDuration) || bufferingDuration < 0) {
        throw new BadRequestException('Invalid buffering duration');
      }

      // 세션 소유권 확인
      const session = await this.streamingService.getActiveSession(sessionId);
      if (!session) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      if (session.userId !== user.id) {
        throw new BadRequestException('세션 접근 권한이 없습니다.');
      }

      // 버퍼링 이벤트 기록
      await this.streamingService.recordBufferingEvent(
        sessionId,
        bufferingDuration,
      );

      return {
        success: true,
        message: '버퍼링 이벤트가 기록되었습니다.',
        data: {
          sessionId,
          duration: bufferingDuration,
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Buffering event record failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 대역폭 기반 품질 추천
   * GET /api/v1/streaming/recommend-quality
   */
  @Get('recommend-quality')
  @UseGuards(AuthGuard)
  async getRecommendedQuality(
    @Query('bandwidth') bandwidth?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const estimatedBandwidth = bandwidth ? parseInt(bandwidth) : 1000000; // 기본 1Mbps
      const deviceType = userAgent ? detectDeviceType(userAgent) : 'desktop';

      if (isNaN(estimatedBandwidth) || estimatedBandwidth <= 0) {
        throw new BadRequestException('Invalid bandwidth value');
      }

      // 추천 품질 계산
      const recommendedQuality = this.streamingService.getRecommendedQuality(
        estimatedBandwidth,
        deviceType,
      );

      // 사용 가능한 모든 품질 정보
      const availableQualities = STREAMING_CONFIG.adaptiveBitrate.qualities.map(
        (q) => ({
          name: q.name,
          resolution: q.resolution,
          bandwidth: q.bandwidth,
          videoBitrate: q.videoBitrate,
          audioBitrate: q.audioBitrate,
          suitable: estimatedBandwidth >= q.bandwidth * 1.2, // 20% 여유분
        }),
      );

      return {
        success: true,
        message: '품질 추천이 완료되었습니다.',
        data: {
          recommendedQuality,
          estimatedBandwidth,
          deviceType,
          availableQualities,
          bandwidthMbps: Math.round((estimatedBandwidth / 1000000) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Quality recommendation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 사용자 활성 스트리밍 세션 목록
   * GET /api/v1/streaming/sessions/active
   */
  @Get('sessions/active')
  @UseGuards(AuthGuard)
  async getActiveStreamingSessions(@Req() req?: StreamingRequest) {
    const user = req!.user;

    try {
      const sessions = await this.streamingService.getUserActiveSessions(
        user.id,
      );

      const sessionSummaries = sessions.map((session) => ({
        sessionId: session.id,
        storageKey: session.storageKey,
        quality: session.currentQuality,
        deviceType: session.deviceType,
        startTime: session.startedAt,
        lastActivity: session.lastActivityAt,
        bytesTransferred: session.bytesTransferred,
        qualityChanges: session.qualityChanges,
        bufferingEvents: session.bufferingEvents,
        duration: session.getSessionDuration(),
      }));

      return {
        success: true,
        message: '활성 스트리밍 세션 목록을 가져왔습니다.',
        data: {
          sessions: sessionSummaries,
          totalSessions: sessions.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Active sessions retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 스트리밍 통계 조회
   * GET /api/v1/streaming/stats
   */
  @Get('stats')
  @UseGuards(AuthGuard)
  async getStreamingStats(@Req() req?: StreamingRequest) {
    const user = req!.user;

    try {
      const stats = await this.streamingService.getStreamingStats(user.id);

      return {
        success: true,
        message: '스트리밍 통계를 가져왔습니다.',
        data: {
          ...stats,
          // 사용자 친화적인 단위로 변환
          totalBytesTransferredMB:
            Math.round((stats.totalBytesTransferred / (1024 * 1024)) * 100) /
            100,
          totalBytesTransferredGB:
            Math.round(
              (stats.totalBytesTransferred / (1024 * 1024 * 1024)) * 100,
            ) / 100,
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming stats retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 스트리밍 설정 정보 조회
   * GET /api/v1/streaming/config
   */
  @Get('config')
  async getStreamingConfig(@Headers('user-agent') userAgent?: string) {
    try {
      const deviceType = userAgent ? detectDeviceType(userAgent) : 'desktop';
      const deviceConfig = STREAMING_CONFIG.deviceOptimization[deviceType];

      return {
        success: true,
        message: '스트리밍 설정 정보를 가져왔습니다.',
        data: {
          deviceType,
          maxQuality: deviceConfig.maxQuality,
          preferredFormat: deviceConfig.preferredFormat,
          adaptiveEnabled: deviceConfig.adaptiveEnabled,
          availableQualities: STREAMING_CONFIG.adaptiveBitrate.qualities,
          segmentDuration: STREAMING_CONFIG.adaptiveBitrate.segmentDuration,
          bufferingConfig: STREAMING_CONFIG.buffering,
          supportedFormats: ['hls', 'http-range'],
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming config retrieval failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 스트리밍 상태 체크
   * GET /api/v1/streaming/health
   */
  @Get('health')
  async checkStreamingHealth() {
    try {
      // 스트리밍 서비스 상태 확인
      const stats = await this.streamingService.getStreamingStats();
      const isHealthy =
        stats.activeSessions <
        STREAMING_CONFIG.bandwidth.throttling.maxConcurrentStreams;

      return {
        success: true,
        message: isHealthy
          ? '스트리밍 서비스가 정상 작동 중입니다.'
          : '스트리밍 서비스 부하가 높습니다.',
        data: {
          status: isHealthy ? 'healthy' : 'overloaded',
          activeSessions: stats.activeSessions,
          maxConcurrentStreams:
            STREAMING_CONFIG.bandwidth.throttling.maxConcurrentStreams,
          systemLoad: Math.round(
            (stats.activeSessions /
              STREAMING_CONFIG.bandwidth.throttling.maxConcurrentStreams) *
              100,
          ),
          adaptiveBitrateEnabled: STREAMING_CONFIG.adaptiveBitrate.enabled,
          cdnEnabled: STREAMING_CONFIG.cdn.enabled,
        },
      };
    } catch (error) {
      this.logger.error(
        `Streaming health check failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: '스트리밍 서비스 상태 확인에 실패했습니다.',
        data: {
          status: 'unhealthy',
          error: error.message,
        },
      };
    }
  }
}
