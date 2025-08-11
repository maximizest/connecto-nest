import { Injectable, Logger } from '@nestjs/common';
import { Planet } from '../../planet/planet.entity';
import { TravelUser } from '../../travel-user/travel-user.entity';
import { Travel } from '../../travel/travel.entity';
import { RedisService } from '../redis.service';

export interface CachedTravelInfo {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  status: string;
  visibility: string;
  expiryDate?: Date;
  memberCount: number;
  planetCount: number;
  lastActivityAt?: Date;
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedTravelMember {
  userId: number;
  role: string;
  status: string;
  joinedAt: Date;
  lastSeenAt?: Date;
  isOnline: boolean;
}

export interface CachedTravelPlanet {
  id: number;
  name: string;
  type: string;
  status: string;
  isActive: boolean;
  memberCount: number;
  messageCount: number;
  lastMessageAt?: Date;
}

export interface TravelStatistics {
  totalMembers: number;
  onlineMembers: number;
  activePlanets: number;
  totalMessages: number;
  todayMessages: number;
  lastActivityAt?: Date;
}

@Injectable()
export class TravelCacheService {
  private readonly logger = new Logger(TravelCacheService.name);

  // 캐시 키 접두사
  private readonly TRAVEL_INFO_KEY = 'travel:info';
  private readonly TRAVEL_MEMBERS_KEY = 'travel:members';
  private readonly TRAVEL_PLANETS_KEY = 'travel:planets';
  private readonly TRAVEL_STATS_KEY = 'travel:stats';
  private readonly TRAVEL_ONLINE_MEMBERS_KEY = 'travel:online';
  private readonly TRAVEL_ACTIVITY_KEY = 'travel:activity';

  // 캐시 만료 시간 (초)
  private readonly TRAVEL_INFO_TTL = 3600; // 1시간
  private readonly TRAVEL_MEMBERS_TTL = 1800; // 30분
  private readonly TRAVEL_PLANETS_TTL = 900; // 15분
  private readonly TRAVEL_STATS_TTL = 300; // 5분
  private readonly TRAVEL_ONLINE_TTL = 60; // 1분

  constructor(private readonly redisService: RedisService) {}

  /**
   * Travel 기본 정보 캐시 저장
   */
  async setTravelInfo(
    travelId: number,
    travel: CachedTravelInfo,
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_INFO_KEY}:${travelId}`;
      await this.redisService.setJson(key, travel, this.TRAVEL_INFO_TTL);

      this.logger.debug(`Travel info cached: ${travelId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache travel info ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 기본 정보 캐시 조회
   */
  async getTravelInfo(travelId: number): Promise<CachedTravelInfo | null> {
    try {
      const key = `${this.TRAVEL_INFO_KEY}:${travelId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached travel info ${travelId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Travel 멤버 목록 캐시 저장
   */
  async setTravelMembers(
    travelId: number,
    members: CachedTravelMember[],
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_MEMBERS_KEY}:${travelId}`;
      await this.redisService.setJson(key, members, this.TRAVEL_MEMBERS_TTL);

      this.logger.debug(
        `Travel members cached: ${travelId} (${members.length} members)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache travel members ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 멤버 목록 캐시 조회
   */
  async getTravelMembers(
    travelId: number,
  ): Promise<CachedTravelMember[] | null> {
    try {
      const key = `${this.TRAVEL_MEMBERS_KEY}:${travelId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached travel members ${travelId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Travel Planet 목록 캐시 저장
   */
  async setTravelPlanets(
    travelId: number,
    planets: CachedTravelPlanet[],
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_PLANETS_KEY}:${travelId}`;
      await this.redisService.setJson(key, planets, this.TRAVEL_PLANETS_TTL);

      this.logger.debug(
        `Travel planets cached: ${travelId} (${planets.length} planets)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache travel planets ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel Planet 목록 캐시 조회
   */
  async getTravelPlanets(
    travelId: number,
  ): Promise<CachedTravelPlanet[] | null> {
    try {
      const key = `${this.TRAVEL_PLANETS_KEY}:${travelId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached travel planets ${travelId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Travel 통계 정보 캐시 저장
   */
  async setTravelStatistics(
    travelId: number,
    stats: TravelStatistics,
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_STATS_KEY}:${travelId}`;
      await this.redisService.setJson(key, stats, this.TRAVEL_STATS_TTL);

      this.logger.debug(`Travel statistics cached: ${travelId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cache travel statistics ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 통계 정보 캐시 조회
   */
  async getTravelStatistics(
    travelId: number,
  ): Promise<TravelStatistics | null> {
    try {
      const key = `${this.TRAVEL_STATS_KEY}:${travelId}`;
      return await this.redisService.getJson(key);
    } catch (error) {
      this.logger.warn(
        `Failed to get cached travel statistics ${travelId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Travel 온라인 멤버 목록 설정
   */
  async setTravelOnlineMembers(
    travelId: number,
    userIds: number[],
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_ONLINE_MEMBERS_KEY}:${travelId}`;
      await this.redisService.setJson(key, userIds, this.TRAVEL_ONLINE_TTL);

      this.logger.debug(
        `Travel online members cached: ${travelId} (${userIds.length} online)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache travel online members ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 온라인 멤버 목록 조회
   */
  async getTravelOnlineMembers(travelId: number): Promise<number[]> {
    try {
      const key = `${this.TRAVEL_ONLINE_MEMBERS_KEY}:${travelId}`;
      const members = await this.redisService.getJson(key);
      return members || [];
    } catch (error) {
      this.logger.warn(
        `Failed to get cached travel online members ${travelId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Travel 온라인 멤버 추가
   */
  async addTravelOnlineMember(travelId: number, userId: number): Promise<void> {
    try {
      const currentMembers = await this.getTravelOnlineMembers(travelId);
      if (!currentMembers.includes(userId)) {
        currentMembers.push(userId);
        await this.setTravelOnlineMembers(travelId, currentMembers);

        this.logger.debug(
          `User ${userId} joined Travel ${travelId} online list`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to add travel online member ${travelId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 온라인 멤버 제거
   */
  async removeTravelOnlineMember(
    travelId: number,
    userId: number,
  ): Promise<void> {
    try {
      const currentMembers = await this.getTravelOnlineMembers(travelId);
      const updatedMembers = currentMembers.filter((id) => id !== userId);

      if (updatedMembers.length !== currentMembers.length) {
        await this.setTravelOnlineMembers(travelId, updatedMembers);
        this.logger.debug(`User ${userId} left Travel ${travelId} online list`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove travel online member ${travelId}:${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 마지막 활동 시간 업데이트
   */
  async updateTravelActivity(travelId: number): Promise<void> {
    try {
      const key = `${this.TRAVEL_ACTIVITY_KEY}:${travelId}`;
      const now = new Date().toISOString();
      await this.redisService.set(key, now, this.TRAVEL_STATS_TTL);

      this.logger.debug(`Travel ${travelId} activity updated: ${now}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update travel activity ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 캐시 무효화
   */
  async invalidateTravelCache(travelId: number): Promise<void> {
    try {
      const keys = [
        `${this.TRAVEL_INFO_KEY}:${travelId}`,
        `${this.TRAVEL_MEMBERS_KEY}:${travelId}`,
        `${this.TRAVEL_PLANETS_KEY}:${travelId}`,
        `${this.TRAVEL_STATS_KEY}:${travelId}`,
        `${this.TRAVEL_ACTIVITY_KEY}:${travelId}`,
      ];

      await Promise.all(keys.map((key) => this.redisService.del(key)));

      this.logger.debug(`Travel ${travelId} cache invalidated`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate travel cache ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * 여러 Travel 캐시 일괄 무효화
   */
  async invalidateTravelCaches(travelIds: number[]): Promise<void> {
    try {
      const invalidatePromises = travelIds.map((travelId) =>
        this.invalidateTravelCache(travelId),
      );

      await Promise.all(invalidatePromises);

      this.logger.debug(`${travelIds.length} Travel caches invalidated`);
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate multiple travel caches: ${error.message}`,
      );
    }
  }

  /**
   * Travel Entity를 CachedTravelInfo로 변환
   */
  travelEntityToCache(travel: Travel): CachedTravelInfo {
    return {
      id: travel.id,
      name: travel.name,
      description: travel.description,
      isActive: travel.isActive,
      status: travel.status,
      visibility: travel.visibility,
      expiryDate: travel.expiryDate,
      memberCount: travel.memberCount,
      planetCount: travel.planetCount,
      lastActivityAt: travel.lastActivityAt,
      inviteCode: travel.inviteCode,
      createdAt: travel.createdAt,
      updatedAt: travel.updatedAt,
    };
  }

  /**
   * TravelUser를 CachedTravelMember로 변환
   */
  travelUserToMemberCache(
    travelUser: TravelUser,
    isOnline: boolean = false,
  ): CachedTravelMember {
    return {
      userId: travelUser.userId,
      role: travelUser.role,
      status: travelUser.status,
      joinedAt: travelUser.joinedAt,
      lastSeenAt: travelUser.lastSeenAt,
      isOnline,
    };
  }

  /**
   * Planet을 CachedTravelPlanet으로 변환
   */
  planetToTravelPlanetCache(planet: Planet): CachedTravelPlanet {
    return {
      id: planet.id,
      name: planet.name,
      type: planet.type,
      status: planet.status,
      isActive: planet.isActive,
      memberCount: planet.memberCount,
      messageCount: planet.messageCount,
      lastMessageAt: planet.lastMessageAt,
    };
  }
}
