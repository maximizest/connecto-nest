import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../user/user.entity';
import { RedisService } from '../redis.service';

export interface OnlineUserInfo {
  userId: number;
  name: string;
  avatarUrl?: string;
  status: string;
  lastSeenAt: Date;
  connectedAt: Date;
  socketIds: string[];
  currentTravelId?: number;
  currentPlanetId?: number;
}

export interface UserActivity {
  userId: number;
  action: string;
  targetType: 'travel' | 'planet' | 'message';
  targetId: number;
  timestamp: Date;
  metadata?: any;
}

export interface GlobalOnlineStats {
  totalOnlineUsers: number;
  totalActiveTravels: number;
  totalActivePlanets: number;
  lastUpdated: Date;
}

@Injectable()
export class OnlinePresenceService {
  private readonly logger = new Logger(OnlinePresenceService.name);

  // 캐시 키 접두사
  private readonly ONLINE_USER_KEY = 'online:user';
  private readonly ONLINE_USERS_KEY = 'online:users';
  private readonly USER_SOCKETS_KEY = 'user:sockets';
  private readonly USER_ACTIVITY_KEY = 'user:activity';
  private readonly GLOBAL_STATS_KEY = 'global:stats';
  private readonly TRAVEL_ONLINE_COUNT_KEY = 'travel:online:count';
  private readonly PLANET_ONLINE_COUNT_KEY = 'planet:online:count';

  // 캐시 만료 시간 (초)
  private readonly ONLINE_USER_TTL = 300; // 5분
  private readonly ONLINE_USERS_TTL = 60; // 1분
  private readonly USER_ACTIVITY_TTL = 3600; // 1시간
  private readonly GLOBAL_STATS_TTL = 300; // 5분

  constructor(private readonly redisService: RedisService) {}

  /**
   * 사용자 온라인 상태 설정
   */
  async setUserOnline(userId: number, userInfo: OnlineUserInfo): Promise<void> {
    try {
      const userKey = `${this.ONLINE_USER_KEY}:${userId}`;
      await this.redisService.setJson(userKey, userInfo, this.ONLINE_USER_TTL);

      // 전체 온라인 사용자 목록에 추가
      await this.addToOnlineUsersList(userId);

      this.logger.debug(`User ${userId} set online`);
    } catch (error) {
      this.logger.warn(`Failed to set user online ${userId}: ${error.message}`);
    }
  }

  /**
   * 사용자 온라인 상태 조회
   */
  async getUserOnlineInfo(userId: number): Promise<OnlineUserInfo | null> {
    try {
      const userKey = `${this.ONLINE_USER_KEY}:${userId}`;
      return await this.redisService.getJson(userKey);
    } catch (error) {
      this.logger.warn(
        `Failed to get user online info ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 사용자 오프라인 상태로 변경
   */
  async setUserOffline(userId: number): Promise<void> {
    try {
      const userKey = `${this.ONLINE_USER_KEY}:${userId}`;
      await this.redisService.del(userKey);

      // 전체 온라인 사용자 목록에서 제거
      await this.removeFromOnlineUsersList(userId);

      // 소켓 연결 정보 제거
      await this.clearUserSockets(userId);

      this.logger.debug(`User ${userId} set offline`);
    } catch (error) {
      this.logger.warn(
        `Failed to set user offline ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자가 온라인 상태인지 확인
   */
  async isUserOnline(userId: number): Promise<boolean> {
    try {
      const userInfo = await this.getUserOnlineInfo(userId);
      return userInfo !== null;
    } catch (error) {
      this.logger.warn(
        `Failed to check user online status ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 전체 온라인 사용자 목록에 추가
   */
  private async addToOnlineUsersList(userId: number): Promise<void> {
    try {
      const key = this.ONLINE_USERS_KEY;
      const currentUsers =
        ((await this.redisService.getJson(key)) as number[]) || [];

      if (!currentUsers.includes(userId)) {
        currentUsers.push(userId);
        await this.redisService.setJson(
          key,
          currentUsers,
          this.ONLINE_USERS_TTL,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to add to online users list ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * 전체 온라인 사용자 목록에서 제거
   */
  private async removeFromOnlineUsersList(userId: number): Promise<void> {
    try {
      const key = this.ONLINE_USERS_KEY;
      const currentUsers =
        ((await this.redisService.getJson(key)) as number[]) || [];
      const updatedUsers = currentUsers.filter((id: number) => id !== userId);

      if (updatedUsers.length !== currentUsers.length) {
        await this.redisService.setJson(
          key,
          updatedUsers,
          this.ONLINE_USERS_TTL,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to remove from online users list ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * 전체 온라인 사용자 수 조회
   */
  async getOnlineUserCount(): Promise<number> {
    try {
      const key = this.ONLINE_USERS_KEY;
      const users = ((await this.redisService.getJson(key)) as number[]) || [];
      return users.length;
    } catch (error) {
      this.logger.warn(`Failed to get online user count: ${error.message}`);
      return 0;
    }
  }

  /**
   * 전체 온라인 사용자 목록 조회
   */
  async getOnlineUserIds(): Promise<number[]> {
    try {
      const key = this.ONLINE_USERS_KEY;
      return (await this.redisService.getJson(key)) || [];
    } catch (error) {
      this.logger.warn(`Failed to get online user list: ${error.message}`);
      return [];
    }
  }

  /**
   * 사용자 소켓 연결 추가
   */
  async addUserSocket(userId: number, socketId: string): Promise<void> {
    try {
      const key = `${this.USER_SOCKETS_KEY}:${userId}`;
      const sockets =
        ((await this.redisService.getJson(key)) as string[]) || [];

      if (!sockets.includes(socketId)) {
        sockets.push(socketId);
        await this.redisService.setJson(key, sockets, this.ONLINE_USER_TTL);

        // 사용자 온라인 정보 업데이트
        const userInfo = await this.getUserOnlineInfo(userId);
        if (userInfo) {
          userInfo.socketIds = sockets;
          await this.setUserOnline(userId, userInfo);
        }
      }

      this.logger.debug(`Socket ${socketId} added for user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to add user socket ${userId}:${socketId}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자 소켓 연결 제거
   */
  async removeUserSocket(userId: number, socketId: string): Promise<void> {
    try {
      const key = `${this.USER_SOCKETS_KEY}:${userId}`;
      const sockets =
        ((await this.redisService.getJson(key)) as string[]) || [];
      const updatedSockets = sockets.filter((id: string) => id !== socketId);

      if (updatedSockets.length > 0) {
        await this.redisService.setJson(
          key,
          updatedSockets,
          this.ONLINE_USER_TTL,
        );

        // 사용자 온라인 정보 업데이트
        const userInfo = await this.getUserOnlineInfo(userId);
        if (userInfo) {
          userInfo.socketIds = updatedSockets;
          await this.setUserOnline(userId, userInfo);
        }
      } else {
        // 소켓이 모두 제거된 경우 사용자를 오프라인으로 설정
        await this.setUserOffline(userId);
      }

      this.logger.debug(`Socket ${socketId} removed for user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to remove user socket ${userId}:${socketId}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자의 모든 소켓 연결 제거
   */
  async clearUserSockets(userId: number): Promise<void> {
    try {
      const key = `${this.USER_SOCKETS_KEY}:${userId}`;
      await this.redisService.del(key);

      this.logger.debug(`All sockets cleared for user ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to clear user sockets ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자 소켓 목록 조회
   */
  async getUserSockets(userId: number): Promise<string[]> {
    try {
      const key = `${this.USER_SOCKETS_KEY}:${userId}`;
      return ((await this.redisService.getJson(key)) as string[]) || [];
    } catch (error) {
      this.logger.warn(
        `Failed to get user sockets ${userId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 사용자 활동 기록
   */
  async recordUserActivity(activity: UserActivity): Promise<void> {
    try {
      const key = `${this.USER_ACTIVITY_KEY}:${activity.userId}`;
      const activities =
        ((await this.redisService.getJson(key)) as UserActivity[]) || [];

      // 최근 활동을 맨 앞에 추가하고 최대 50개까지만 유지
      activities.unshift(activity);
      const limitedActivities = activities.slice(0, 50);

      await this.redisService.setJson(
        key,
        limitedActivities,
        this.USER_ACTIVITY_TTL,
      );

      this.logger.debug(
        `Activity recorded for user ${activity.userId}: ${activity.action}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record user activity ${activity.userId}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자 활동 기록 조회
   */
  async getUserActivities(
    userId: number,
    limit: number = 20,
  ): Promise<UserActivity[]> {
    try {
      const key = `${this.USER_ACTIVITY_KEY}:${userId}`;
      const activities =
        ((await this.redisService.getJson(key)) as UserActivity[]) || [];
      return activities.slice(0, limit);
    } catch (error) {
      this.logger.warn(
        `Failed to get user activities ${userId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * 사용자 현재 위치 업데이트 (Travel/Planet)
   */
  async updateUserLocation(
    userId: number,
    travelId?: number,
    planetId?: number,
  ): Promise<void> {
    try {
      const userInfo = await this.getUserOnlineInfo(userId);
      if (userInfo) {
        userInfo.currentTravelId = travelId;
        userInfo.currentPlanetId = planetId;
        await this.setUserOnline(userId, userInfo);

        // 활동 기록
        if (travelId || planetId) {
          await this.recordUserActivity({
            userId,
            action: 'location_change',
            targetType: planetId ? 'planet' : 'travel',
            targetId: planetId || travelId!,
            timestamp: new Date(),
            metadata: { travelId, planetId },
          });
        }

        this.logger.debug(
          `User ${userId} location updated: travel=${travelId}, planet=${planetId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to update user location ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Travel 온라인 사용자 수 업데이트
   */
  async updateTravelOnlineCount(
    travelId: number,
    count: number,
  ): Promise<void> {
    try {
      const key = `${this.TRAVEL_ONLINE_COUNT_KEY}:${travelId}`;
      await this.redisService.set(key, count.toString(), this.ONLINE_USERS_TTL);

      this.logger.debug(`Travel ${travelId} online count updated: ${count}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update travel online count ${travelId}: ${error.message}`,
      );
    }
  }

  /**
   * Planet 온라인 사용자 수 업데이트
   */
  async updatePlanetOnlineCount(
    planetId: number,
    count: number,
  ): Promise<void> {
    try {
      const key = `${this.PLANET_ONLINE_COUNT_KEY}:${planetId}`;
      await this.redisService.set(key, count.toString(), this.ONLINE_USERS_TTL);

      this.logger.debug(`Planet ${planetId} online count updated: ${count}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update planet online count ${planetId}: ${error.message}`,
      );
    }
  }

  /**
   * 전역 온라인 통계 업데이트
   */
  async updateGlobalStats(stats: GlobalOnlineStats): Promise<void> {
    try {
      await this.redisService.setJson(
        this.GLOBAL_STATS_KEY,
        stats,
        this.GLOBAL_STATS_TTL,
      );

      this.logger.debug(
        `Global online stats updated: ${stats.totalOnlineUsers} users online`,
      );
    } catch (error) {
      this.logger.warn(`Failed to update global stats: ${error.message}`);
    }
  }

  /**
   * 전역 온라인 통계 조회
   */
  async getGlobalStats(): Promise<GlobalOnlineStats | null> {
    try {
      return await this.redisService.getJson(this.GLOBAL_STATS_KEY);
    } catch (error) {
      this.logger.warn(`Failed to get global stats: ${error.message}`);
      return null;
    }
  }

  /**
   * 만료된 온라인 상태 정리
   */
  async cleanupExpiredOnlineUsers(): Promise<void> {
    try {
      const userIds = await this.getOnlineUserIds();
      const expiredUsers: number[] = [];

      for (const userId of userIds) {
        const userInfo = await this.getUserOnlineInfo(userId);
        if (!userInfo) {
          expiredUsers.push(userId);
        }
      }

      // 만료된 사용자들을 온라인 목록에서 제거
      for (const userId of expiredUsers) {
        await this.removeFromOnlineUsersList(userId);
      }

      if (expiredUsers.length > 0) {
        this.logger.debug(
          `Cleaned up ${expiredUsers.length} expired online users`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup expired online users: ${error.message}`,
      );
    }
  }

  /**
   * User Entity를 OnlineUserInfo로 변환
   */
  userEntityToOnlineInfo(user: User, socketIds: string[] = []): OnlineUserInfo {
    return {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatar,
      status: user.status,
      lastSeenAt: user.lastSeenAt || new Date(),
      connectedAt: new Date(),
      socketIds,
    };
  }
}
