import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/user.entity';
import {
  TypingStatusResponse,
  TypingUserInfo,
  TypingAnalytics,
} from '../dto/typing.dto';

/**
 * 간소화된 타이핑 표시 서비스
 * 캐시 기능을 제거하고 기본 기능만 제공
 */
@Injectable()
export class TypingIndicatorService {
  private readonly logger = new Logger(TypingIndicatorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 타이핑 시작 (간소화 버전)
   */
  async startTyping(
    userId: number,
    planetId: number,
    options: {
      deviceType?: string;
      typingType?: string;
      contentLength?: number;
      sessionId?: string;
    } = {},
  ): Promise<TypingUserInfo> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const typingInfo: TypingUserInfo = {
        userId,
        userName: user.name,
        deviceType: options.deviceType || 'unknown',
        typingType: options.typingType || 'text',
        startedAt: new Date(),
        contentLength: options.contentLength || 0,
      };

      this.logger.debug(
        `Typing started (simplified): userId=${userId}, planetId=${planetId}`,
      );

      return typingInfo;
    } catch (error) {
      this.logger.error(`Failed to start typing: ${error.message}`);
      throw error;
    }
  }

  /**
   * 타이핑 중지 (간소화 버전)
   */
  async stopTyping(
    userId: number,
    planetId: number,
    options: {
      messageSent?: boolean;
      finalContentLength?: number;
    } = {},
  ): Promise<void> {
    this.logger.debug(
      `Typing stopped (simplified): userId=${userId}, planetId=${planetId}`,
    );
  }

  /**
   * 타이핑 상태 조회 (간소화 버전)
   */
  async getTypingStatus(
    planetId: number,
    includeAnalytics = false,
  ): Promise<TypingStatusResponse> {
    const response: TypingStatusResponse = {
      planetId,
      users: [],
      typingUsers: [],
      totalTyping: 0,
      totalTypingCount: 0,
      timestamp: new Date(),
    };

    this.logger.debug(
      `Typing status retrieved (simplified): planetId=${planetId}`,
    );

    return response;
  }

  /**
   * 타이핑 분석 정보 조회 (간소화 버전)
   */
  async getTypingAnalytics(planetId: number): Promise<TypingAnalytics> {
    const analytics: TypingAnalytics = {
      planetId,
      averageTypingDuration: 0,
      peakConcurrentTypers: 0,
      totalTypingEvents: 0,
      mostActiveHour: 0,
      planetActivityScore: 0,
      activeTypingUsers: 0,
    };

    this.logger.debug(
      `Typing analytics retrieved (simplified): planetId=${planetId}`,
    );

    return analytics;
  }

  /**
   * 모든 타이핑 상태 정리 (간소화 버전)
   */
  async clearAllTypingStates(planetId?: number): Promise<void> {
    this.logger.debug(
      `All typing states cleared (simplified)${planetId ? ` for planetId=${planetId}` : ''}`,
    );
  }

  /**
   * 타이핑 업데이트 (간소화 버전)
   */
  async updateTyping(
    userId: number,
    planetId: number,
    options: {
      deviceType?: string;
      typingType?: string;
      contentLength?: number;
    } = {},
  ): Promise<void> {
    this.logger.debug(
      `Typing updated (simplified): userId=${userId}, planetId=${planetId}`,
    );
  }

  /**
   * Planet의 타이핑 중인 사용자 목록 조회 (간소화 버전)
   */
  async getPlanetTypingUsers(planetId: number): Promise<TypingUserInfo[]> {
    this.logger.debug(
      `Planet typing users retrieved (simplified): planetId=${planetId}`,
    );
    return [];
  }
}
