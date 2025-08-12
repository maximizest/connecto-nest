import { Injectable, Logger } from '@nestjs/common';
import { Message } from '../../message/message.entity';
import { PlanetUser } from '../../planet-user/planet-user.entity';
import { Planet } from '../../planet/planet.entity';
import { RedisService } from '../redis.service';

export interface CachedPlanetInfo {
  id: number;
  name: string;
  description?: string;
  type: string;
  travelId: number;
  isActive: boolean;
  status: string;
  memberCount: number;
  messageCount: number;
  lastMessageAt?: Date;
  timeRestrictions?: any;
  settings?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedPlanetMember {
  userId: number;
  role: string;
  status: string;
  joinedAt: Date;
  lastSeenAt?: Date;
  isOnline: boolean;
  permissions?: any;
}

export interface CachedRecentMessage {
  id: number;
  type: string;
  content?: string;
  senderId: number;
  senderName?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface PlanetStatistics {
  totalMembers: number;
  onlineMembers: number;
  totalMessages: number;
  todayMessages: number;
  lastHourMessages: number;
  activeUsers: number;
  lastMessageAt?: Date;
}

export interface TypingUser {
  userId: number;
  userName: string;
  startedAt: Date;
}

@Injectable()
export class PlanetCacheService {
  private readonly logger = new Logger(PlanetCacheService.name);

  // 캐시 키 접두사
  private readonly PLANET_INFO_KEY = 'planet:info';
  private readonly PLANET_MEMBERS_KEY = 'planet:members';
  private readonly PLANET_RECENT_MESSAGES_KEY = 'planet:recent';
  private readonly PLANET_STATS_KEY = 'planet:stats';
  private readonly PLANET_ONLINE_MEMBERS_KEY = 'planet:online';
  private readonly PLANET_TYPING_KEY = 'planet:typing';
  private readonly PLANET_ACTIVITY_KEY = 'planet:activity';

  // 캐시 만료 시간 (초)
  private readonly PLANET_INFO_TTL = 1800; // 30분
  private readonly PLANET_MEMBERS_TTL = 900; // 15분
  private readonly PLANET_RECENT_MESSAGES_TTL = 600; // 10분
  private readonly PLANET_STATS_TTL = 300; // 5분
  private readonly PLANET_ONLINE_TTL = 60; // 1분
  private readonly PLANET_TYPING_TTL = 10; // 10초

  constructor(private readonly redisService: RedisService) {}

  /**
   * Planet 기본 정보 캐시 저장
   */
  async setPlanetInfo(
    planetId: number,
    planet: CachedPlanetInfo,
  ): Promise<void> {
    try {
      const key = `${this.PLANET_INFO_KEY}:${planetId}`;
      await this.redisService.setJson(key, planet, this.PLANET_INFO_TTL);

      this.logger.debug(`Planet info cached: ${planetId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet info ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 기본 정보 캐시 조회
   */
  async getPlanetInfo(planetId: number): Promise<CachedPlanetInfo | null> {
    try {
      const key = `${this.PLANET_INFO_KEY}:${planetId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet info ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Planet 멤버 목록 캐시 저장
   */
  async setPlanetMembers(
    planetId: number,
    members: CachedPlanetMember[],
  ): Promise<void> {
    try {
      const key = `${this.PLANET_MEMBERS_KEY}:${planetId}`;
      await this.redisService.setJson(key, members, this.PLANET_MEMBERS_TTL);

      this.logger.debug(
        `Planet members cached: ${planetId} (${members.length} members)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet members ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 멤버 목록 캐시 조회
   */
  async getPlanetMembers(
    planetId: number,
  ): Promise<CachedPlanetMember[] | null> {
    try {
      const key = `${this.PLANET_MEMBERS_KEY}:${planetId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet members ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Planet 최근 메시지 캐시 저장
   */
  async setRecentMessages(
    planetId: number,
    messages: CachedRecentMessage[],
  ): Promise<void> {
    try {
      const key = `${this.PLANET_RECENT_MESSAGES_KEY}:${planetId}`;
      await this.redisService.setJson(
        key,
        messages,
        this.PLANET_RECENT_MESSAGES_TTL,
      );

      this.logger.debug(
        `Planet recent messages cached: ${planetId} (${messages.length} messages)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet recent messages ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 최근 메시지 캐시 조회
   */
  async getRecentMessages(
    planetId: number,
  ): Promise<CachedRecentMessage[] | null> {
    try {
      const key = `${this.PLANET_RECENT_MESSAGES_KEY}:${planetId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet recent messages ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Planet 통계 정보 캐시 저장
   */
  async setPlanetStatistics(
    planetId: number,
    stats: PlanetStatistics,
  ): Promise<void> {
    try {
      const key = `${this.PLANET_STATS_KEY}:${planetId}`;
      await this.redisService.setJson(key, stats, this.PLANET_STATS_TTL);

      this.logger.debug(`Planet statistics cached: ${planetId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet statistics ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 통계 정보 캐시 조회
   */
  async getPlanetStatistics(
    planetId: number,
  ): Promise<PlanetStatistics | null> {
    try {
      const key = `${this.PLANET_STATS_KEY}:${planetId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet statistics ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Planet 온라인 멤버 목록 설정
   */
  async setPlanetOnlineMembers(
    planetId: number,
    userIds: number[],
  ): Promise<void> {
    try {
      const key = `${this.PLANET_ONLINE_MEMBERS_KEY}:${planetId}`;
      await this.redisService.setJson(key, userIds, this.PLANET_ONLINE_TTL);

      this.logger.debug(
        `Planet online members cached: ${planetId} (${userIds.length} online)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet online members ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 온라인 멤버 목록 조회
   */
  async getPlanetOnlineMembers(planetId: number): Promise<number[]> {
    try {
      const key = `${this.PLANET_ONLINE_MEMBERS_KEY}:${planetId}`;
      const members = await this.redisService.getJson(key);
      return (members as number[]) || [];
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet online members ${planetId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Planet 온라인 멤버 추가
   */
  async addPlanetOnlineMember(planetId: number, userId: number): Promise<void> {
    try {
      const currentMembers = await this.getPlanetOnlineMembers(planetId);
      if (!currentMembers.includes(userId)) {
        currentMembers.push(userId);
        await this.setPlanetOnlineMembers(planetId, currentMembers);

        this.logger.debug(
          `User ${userId} joined Planet ${planetId} online list`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to add planet online member ${planetId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 온라인 멤버 제거
   */
  async removePlanetOnlineMember(
    planetId: number,
    userId: number,
  ): Promise<void> {
    try {
      const currentMembers = await this.getPlanetOnlineMembers(planetId);
      const updatedMembers = currentMembers.filter((id) => id !== userId);

      if (updatedMembers.length !== currentMembers.length) {
        await this.setPlanetOnlineMembers(planetId, updatedMembers);
        this.logger.debug(`User ${userId} left Planet ${planetId} online list`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove planet online member ${planetId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 타이핑 사용자 설정
   */
  async setTypingUsers(
    planetId: number,
    typingUsers: TypingUser[],
  ): Promise<void> {
    try {
      const key = `${this.PLANET_TYPING_KEY}:${planetId}`;
      await this.redisService.setJson(key, typingUsers, this.PLANET_TYPING_TTL);

      this.logger.debug(
        `Planet typing users cached: ${planetId} (${typingUsers.length} typing)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache planet typing users ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 타이핑 사용자 조회
   */
  async getTypingUsers(planetId: number): Promise<TypingUser[]> {
    try {
      const key = `${this.PLANET_TYPING_KEY}:${planetId}`;
      const users = await this.redisService.getJson(key);

      if (!users) return [];

      // 만료된 타이핑 상태 필터링 (30초 이상된 것)
      const now = new Date();
      const validUsers = (users as TypingUser[]).filter((user: TypingUser) => {
        const startedAt = new Date(user.startedAt);
        return now.getTime() - startedAt.getTime() < 30000;
      });

      // 필터링된 결과로 캐시 업데이트
      if (validUsers.length !== (users as TypingUser[]).length) {
        await this.setTypingUsers(planetId, validUsers);
      }

      return validUsers;
    } catch (error) {
      this.logger.warn(
        `Failed to get cached planet typing users ${planetId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Planet 타이핑 사용자 추가
   */
  async addTypingUser(
    planetId: number,
    userId: number,
    userName: string,
  ): Promise<void> {
    try {
      const currentTyping = await this.getTypingUsers(planetId);
      const existingIndex = currentTyping.findIndex(
        (user) => user.userId === userId,
      );

      if (existingIndex >= 0) {
        // 기존 사용자의 타이핑 시작 시간 업데이트
        currentTyping[existingIndex].startedAt = new Date();
      } else {
        // 새로운 타이핑 사용자 추가
        currentTyping.push({
          userId,
          userName,
          startedAt: new Date(),
        });
      }

      await this.setTypingUsers(planetId, currentTyping);
      this.logger.debug(`User ${userId} started typing in Planet ${planetId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to add typing user ${planetId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 타이핑 사용자 제거
   */
  async removeTypingUser(planetId: number, userId: number): Promise<void> {
    try {
      const currentTyping = await this.getTypingUsers(planetId);
      const updatedTyping = currentTyping.filter(
        (user) => user.userId !== userId,
      );

      if (updatedTyping.length !== currentTyping.length) {
        await this.setTypingUsers(planetId, updatedTyping);
        this.logger.debug(
          `User ${userId} stopped typing in Planet ${planetId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove typing user ${planetId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 마지막 활동 시간 업데이트
   */
  async updatePlanetActivity(planetId: number): Promise<void> {
    try {
      const key = `${this.PLANET_ACTIVITY_KEY}:${planetId}`;
      const now = new Date().toISOString();
      await this.redisService.set(key, now, this.PLANET_STATS_TTL);

      this.logger.debug(`Planet ${planetId} activity updated: ${now}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update planet activity ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 캐시 무효화
   */
  async invalidatePlanetCache(planetId: number): Promise<void> {
    try {
      const keys = [
        `${this.PLANET_INFO_KEY}:${planetId}`,
        `${this.PLANET_MEMBERS_KEY}:${planetId}`,
        `${this.PLANET_RECENT_MESSAGES_KEY}:${planetId}`,
        `${this.PLANET_STATS_KEY}:${planetId}`,
        `${this.PLANET_ACTIVITY_KEY}:${planetId}`,
      ];

      await Promise.all(keys.map((key) => this.redisService.del(key)));

      this.logger.debug(`Planet ${planetId} cache invalidated`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate planet cache ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * 여러 Planet 캐시 일괄 무효화
   */
  async invalidatePlanetCaches(planetIds: number[]): Promise<void> {
    try {
      const invalidatePromises = planetIds.map((planetId) =>
        this.invalidatePlanetCache(planetId),
      );

      await Promise.all(invalidatePromises);

      this.logger.debug(`${planetIds.length} Planet caches invalidated`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate multiple planet caches: ${error.message}`,
      );
    }
  }

  /**
   * Planet Entity를 CachedPlanetInfo로 변환
   */
  planetEntityToCache(planet: Planet): CachedPlanetInfo {
    return {
      id: planet.id,
      name: planet.name,
      description: planet.description,
      type: planet.type,
      travelId: planet.travelId,
      isActive: planet.isActive,
      status: planet.status,
      memberCount: planet.memberCount,
      messageCount: planet.messageCount,
      lastMessageAt: planet.lastMessageAt,
      timeRestrictions: planet.timeRestriction,
      settings: planet.settings,
      createdAt: planet.createdAt,
      updatedAt: planet.updatedAt,
    };
  }

  /**
   * PlanetUser를 CachedPlanetMember로 변환
   */
  planetUserToMemberCache(
    planetUser: PlanetUser,
    isOnline: boolean = false,
  ): CachedPlanetMember {
    return {
      userId: planetUser.userId || -1, // 탈퇴한 사용자는 -1로 처리
      role: planetUser.role,
      status: planetUser.status,
      joinedAt: planetUser.joinedAt,
      lastSeenAt: planetUser.lastSeenAt,
      isOnline,
      permissions: planetUser.permissions,
    };
  }

  /**
   * Message를 CachedRecentMessage로 변환
   */
  messageToRecentCache(
    message: Message,
    senderName?: string,
  ): CachedRecentMessage {
    return {
      id: message.id,
      type: message.type,
      content: message.content,
      senderId: message.senderId || -1, // 탈퇴한 사용자는 -1로 처리
      senderName,
      fileUrl: message.fileMetadata?.url,
      fileName: message.fileMetadata?.fileName,
      fileSize: message.fileMetadata?.fileSize,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
    };
  }
}
