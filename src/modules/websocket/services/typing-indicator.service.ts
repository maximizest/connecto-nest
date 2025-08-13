import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../cache/redis.service';

import { Planet } from '../../planet/planet.entity';
import { User } from '../../user/user.entity';
import {
  AdvancedTypingDto,
  TypingAnalytics,
  TypingStatusResponse,
  TypingUserInfo,
} from '../dto/typing.dto';

/**
 * 타이핑 상태 정보
 */
interface TypingState {
  userId: number;
  userName: string;
  avatarUrl?: string;
  planetId: number;
  isTyping: boolean;
  deviceType?: string;
  typingType?: string;
  startedAt: Date;
  lastActivity: Date;
  contentLength?: number;
  sessionId?: string;
}

@Injectable()
export class TypingIndicatorService {
  private readonly logger = new Logger(TypingIndicatorService.name);

  // 캐시 키 접두사
  private readonly TYPING_KEY = 'typing';
  private readonly TYPING_USERS_KEY = 'typing:users';
  private readonly TYPING_ANALYTICS_KEY = 'typing:analytics';
  private readonly TYPING_PATTERN_KEY = 'typing:patterns';

  // 캐시 만료 시간 (초)
  private readonly TYPING_TTL = 10; // 10초 - 타이핑 상태 자동 해제
  private readonly TYPING_ANALYTICS_TTL = 3600; // 1시간
  private readonly TYPING_CLEANUP_INTERVAL = 5000; // 5초마다 정리

  // 타이핑 상태 정리 타이머
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {
    // 주기적으로 만료된 타이핑 상태 정리
    this.startCleanupTimer();
  }

  /**
   * 타이핑 상태 시작
   */
  async startTyping(
    userId: number,
    planetId: number,
    options: {
      deviceType?: string;
      typingType?: 'text' | 'voice' | 'file' | 'image';
      contentLength?: number;
      sessionId?: string;
    } = {},
  ): Promise<TypingUserInfo> {
    try {
      // 사용자 정보 조회
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'avatar'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const typingState: TypingState = {
        userId,
        userName: user.name,
        avatarUrl: user.avatar,
        planetId,
        isTyping: true,
        deviceType: options.deviceType || 'unknown',
        typingType: options.typingType || 'text',
        startedAt: new Date(),
        lastActivity: new Date(),
        contentLength: options.contentLength || 0,
        sessionId: options.sessionId,
      };

      // Redis에 타이핑 상태 저장
      const typingKey = `${this.TYPING_KEY}:${planetId}:${userId}`;
      await this.redisService.setJson(typingKey, typingState, this.TYPING_TTL);

      // Planet의 타이핑 사용자 목록에 추가
      const planetTypingKey = `${this.TYPING_USERS_KEY}:${planetId}`;
      const typingUsers =
        ((await this.redisService.getJson(planetTypingKey)) as number[]) || [];

      if (!typingUsers.includes(userId)) {
        typingUsers.push(userId);
        await this.redisService.setJson(
          planetTypingKey,
          typingUsers,
          this.TYPING_TTL,
        );
      }

      // 타이핑 분석 데이터 업데이트
      await this.updateTypingAnalytics(planetId, typingState);

      // 타이핑 상태 로깅
      this.logger.debug(`User ${userId} started typing in Planet ${planetId}`);

      this.logger.debug(
        `Typing started: userId=${userId}, planetId=${planetId}, type=${options.typingType}`,
      );

      return this.mapToTypingUserInfo(typingState);
    } catch (error) {
      this.logger.warn(
        `Failed to start typing: userId=${userId}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 타이핑 상태 중지
   */
  async stopTyping(userId: number, planetId: number): Promise<void> {
    try {
      const typingKey = `${this.TYPING_KEY}:${planetId}:${userId}`;
      const typingState =
        await this.redisService.getJson<TypingState>(typingKey);

      if (typingState) {
        // 타이핑 지속 시간 계산
        const duration = Date.now() - typingState.startedAt.getTime();

        // 분석 데이터 업데이트 (종료 시점)
        await this.recordTypingCompletion(
          planetId,
          userId,
          duration,
          typingState,
        );

        // Redis에서 타이핑 상태 제거
        await this.redisService.del(typingKey);

        // Planet의 타이핑 사용자 목록에서 제거
        await this.removeFromPlanetTypingUsers(planetId, userId);

        // 타이핑 중지 로깅
        this.logger.debug(
          `User ${userId} stopped typing in Planet ${planetId}`,
        );

        this.logger.debug(
          `Typing stopped: userId=${userId}, planetId=${planetId}, duration=${duration}ms`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to stop typing: userId=${userId}, error=${error.message}`,
      );
    }
  }

  /**
   * 타이핑 상태 업데이트 (진행 중)
   */
  async updateTyping(
    userId: number,
    planetId: number,
    updates: Partial<AdvancedTypingDto>,
  ): Promise<void> {
    try {
      const typingKey = `${this.TYPING_KEY}:${planetId}:${userId}`;
      const typingState =
        await this.redisService.getJson<TypingState>(typingKey);

      if (typingState) {
        // 상태 업데이트
        const updatedState: TypingState = {
          ...typingState,
          lastActivity: new Date(),
          contentLength: updates.contentLength || typingState.contentLength,
          typingType: updates.typingType || typingState.typingType,
        };

        // TTL 연장하여 저장
        await this.redisService.setJson(
          typingKey,
          updatedState,
          this.TYPING_TTL,
        );

        this.logger.debug(
          `Typing updated: userId=${userId}, planetId=${planetId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update typing: userId=${userId}, error=${error.message}`,
      );
    }
  }

  /**
   * Planet의 타이핑 중인 사용자 목록 조회
   */
  async getPlanetTypingUsers(planetId: number): Promise<TypingStatusResponse> {
    try {
      const planetTypingKey = `${this.TYPING_USERS_KEY}:${planetId}`;
      const userIds =
        ((await this.redisService.getJson(planetTypingKey)) as number[]) || [];

      const typingUsers: TypingUserInfo[] = [];

      for (const userId of userIds) {
        const typingKey = `${this.TYPING_KEY}:${planetId}:${userId}`;
        const typingState =
          await this.redisService.getJson<TypingState>(typingKey);

        if (typingState && typingState.isTyping) {
          // 타이핑 지속 시간 계산
          const duration = Date.now() - typingState.startedAt.getTime();
          const estimatedDuration = this.estimateTypingDuration(
            typingState.contentLength || 0,
            typingState.typingType || 'text',
          );

          typingUsers.push({
            userId: typingState.userId,
            userName: typingState.userName,
            avatarUrl: typingState.avatarUrl,
            deviceType: typingState.deviceType,
            typingType: typingState.typingType,
            startedAt: typingState.startedAt,
            estimatedDuration,
            contentLength: typingState.contentLength,
          });
        }
      }

      return {
        planetId,
        typingUsers,
        totalTypingCount: typingUsers.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get planet typing users: planetId=${planetId}, error=${error.message}`,
      );
      return {
        planetId,
        typingUsers: [],
        totalTypingCount: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 타이핑 분석 데이터 조회
   */
  async getTypingAnalytics(planetId: number): Promise<TypingAnalytics> {
    try {
      const analyticsKey = `${this.TYPING_ANALYTICS_KEY}:${planetId}`;
      const analytics =
        await this.redisService.getJson<TypingAnalytics>(analyticsKey);

      if (analytics) {
        return analytics;
      }

      // 기본 분석 데이터 반환
      return {
        planetId,
        averageTypingDuration: 0,
        totalTypingEvents: 0,
        activeTypingUsers: 0,
        typingPatterns: {
          hourly: {},
          deviceType: {},
          typingType: {},
        },
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get typing analytics: planetId=${planetId}, error=${error.message}`,
      );
      return {
        planetId,
        averageTypingDuration: 0,
        totalTypingEvents: 0,
        activeTypingUsers: 0,
        typingPatterns: {
          hourly: {},
          deviceType: {},
          typingType: {},
        },
      };
    }
  }

  /**
   * 특정 사용자의 타이핑 상태 확인
   */
  async isUserTyping(userId: number, planetId: number): Promise<boolean> {
    try {
      const typingKey = `${this.TYPING_KEY}:${planetId}:${userId}`;
      const typingState =
        await this.redisService.getJson<TypingState>(typingKey);
      return typingState?.isTyping === true;
    } catch (error) {
      this.logger.warn(
        `Failed to check user typing: userId=${userId}, error=${error.message}`,
      );
      return false;
    }
  }

  /**
   * 만료된 타이핑 상태 정리
   */
  async cleanupExpiredTyping(): Promise<void> {
    try {
      // Planet별 타이핑 사용자 목록 정리는 복잡하므로
      // TTL에 의존하고 주기적으로 빈 목록들을 정리
      this.logger.debug('Typing cleanup completed');
    } catch (error) {
      this.logger.warn(`Failed to cleanup expired typing: ${error.message}`);
    }
  }

  // ==============================
  // Private Helper Methods
  // ==============================

  /**
   * 타이핑 상태를 TypingUserInfo로 변환
   */
  private mapToTypingUserInfo(state: TypingState): TypingUserInfo {
    const duration = Date.now() - state.startedAt.getTime();
    const estimatedDuration = this.estimateTypingDuration(
      state.contentLength || 0,
      state.typingType || 'text',
    );

    return {
      userId: state.userId,
      userName: state.userName,
      avatarUrl: state.avatarUrl,
      deviceType: state.deviceType,
      typingType: state.typingType,
      startedAt: state.startedAt,
      estimatedDuration,
      contentLength: state.contentLength,
    };
  }

  /**
   * Planet 타이핑 사용자 목록에서 제거
   */
  private async removeFromPlanetTypingUsers(
    planetId: number,
    userId: number,
  ): Promise<void> {
    const planetTypingKey = `${this.TYPING_USERS_KEY}:${planetId}`;
    const typingUsers =
      ((await this.redisService.getJson(planetTypingKey)) as number[]) || [];
    const updatedUsers = typingUsers.filter((id) => id !== userId);

    if (updatedUsers.length > 0) {
      await this.redisService.setJson(
        planetTypingKey,
        updatedUsers,
        this.TYPING_TTL,
      );
    } else {
      await this.redisService.del(planetTypingKey);
    }
  }

  /**
   * 타이핑 분석 데이터 업데이트
   */
  private async updateTypingAnalytics(
    planetId: number,
    typingState: TypingState,
  ): Promise<void> {
    try {
      const analyticsKey = `${this.TYPING_ANALYTICS_KEY}:${planetId}`;
      let analytics =
        await this.redisService.getJson<TypingAnalytics>(analyticsKey);

      if (!analytics) {
        analytics = {
          planetId,
          averageTypingDuration: 0,
          totalTypingEvents: 0,
          activeTypingUsers: 0,
          typingPatterns: {
            hourly: {},
            deviceType: {},
            typingType: {},
          },
        };
      }

      // 이벤트 카운트 증가
      analytics.totalTypingEvents += 1;

      // 시간대별 패턴 업데이트
      const hour = new Date().getHours();
      analytics.typingPatterns.hourly[hour] =
        (analytics.typingPatterns.hourly[hour] || 0) + 1;

      // 디바이스별 패턴 업데이트
      if (typingState.deviceType) {
        analytics.typingPatterns.deviceType[typingState.deviceType] =
          (analytics.typingPatterns.deviceType[typingState.deviceType] || 0) +
          1;
      }

      // 타이핑 유형별 패턴 업데이트
      if (typingState.typingType) {
        analytics.typingPatterns.typingType[typingState.typingType] =
          (analytics.typingPatterns.typingType[typingState.typingType] || 0) +
          1;
      }

      await this.redisService.setJson(
        analyticsKey,
        analytics,
        this.TYPING_ANALYTICS_TTL,
      );
    } catch (error) {
      this.logger.warn(`Failed to update typing analytics: ${error.message}`);
    }
  }

  /**
   * 타이핑 완료 기록
   */
  private async recordTypingCompletion(
    planetId: number,
    userId: number,
    duration: number,
    typingState: TypingState,
  ): Promise<void> {
    try {
      const analyticsKey = `${this.TYPING_ANALYTICS_KEY}:${planetId}`;
      const analytics =
        await this.redisService.getJson<TypingAnalytics>(analyticsKey);

      if (analytics) {
        // 평균 타이핑 시간 업데이트
        const totalEvents = analytics.totalTypingEvents;
        const currentAverage = analytics.averageTypingDuration;
        const newAverage =
          (currentAverage * totalEvents + duration) / (totalEvents + 1);

        analytics.averageTypingDuration = Math.round(newAverage);

        await this.redisService.setJson(
          analyticsKey,
          analytics,
          this.TYPING_ANALYTICS_TTL,
        );
      }

      // 개별 타이핑 패턴 기록 (옵션)
      const patternKey = `${this.TYPING_PATTERN_KEY}:${planetId}:${userId}:${Date.now()}`;
      const patternData = {
        userId,
        planetId,
        duration,
        contentLength: typingState.contentLength,
        typingType: typingState.typingType,
        deviceType: typingState.deviceType,
        completedAt: new Date(),
      };

      await this.redisService.setJson(patternKey, patternData, 86400); // 1일 보관
    } catch (error) {
      this.logger.warn(`Failed to record typing completion: ${error.message}`);
    }
  }

  /**
   * 타이핑 예상 시간 계산
   */
  private estimateTypingDuration(
    contentLength: number,
    typingType: string,
  ): number {
    // 간단한 추정 로직 (실제로는 더 정교한 알고리즘 필요)
    const baseTime = 1000; // 1초
    const charTime = 100; // 글자당 100ms

    switch (typingType) {
      case 'text':
        return baseTime + contentLength * charTime;
      case 'voice':
        return baseTime * 2; // 음성은 더 긺
      case 'file':
        return baseTime * 3; // 파일은 더 긺
      case 'image':
        return baseTime * 1.5;
      default:
        return baseTime;
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredTyping();
    }, this.TYPING_CLEANUP_INTERVAL);
  }

  /**
   * 정리 타이머 중지
   */
  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
