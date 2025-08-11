import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnlinePresenceService } from './online-presence.service';
import { PlanetCacheService } from './planet-cache.service';
import { TravelCacheService } from './travel-cache.service';

export interface CacheEvent {
  type: 'invalidate' | 'update' | 'delete';
  entity: 'travel' | 'planet' | 'user' | 'message';
  entityId: number;
  relatedIds?: {
    travelId?: number;
    planetId?: number;
    userId?: number;
  };
  metadata?: any;
  timestamp: Date;
}

@Injectable()
export class CacheEventManagerService {
  private readonly logger = new Logger(CacheEventManagerService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly travelCacheService: TravelCacheService,
    private readonly planetCacheService: PlanetCacheService,
    private readonly onlinePresenceService: OnlinePresenceService,
  ) {
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // Travel 관련 이벤트
    this.eventEmitter.on('travel.created', this.handleTravelCreated.bind(this));
    this.eventEmitter.on('travel.updated', this.handleTravelUpdated.bind(this));
    this.eventEmitter.on('travel.deleted', this.handleTravelDeleted.bind(this));
    this.eventEmitter.on('travel.expired', this.handleTravelExpired.bind(this));

    // Planet 관련 이벤트
    this.eventEmitter.on('planet.created', this.handlePlanetCreated.bind(this));
    this.eventEmitter.on('planet.updated', this.handlePlanetUpdated.bind(this));
    this.eventEmitter.on('planet.deleted', this.handlePlanetDeleted.bind(this));

    // 사용자 관련 이벤트
    this.eventEmitter.on('user.online', this.handleUserOnline.bind(this));
    this.eventEmitter.on('user.offline', this.handleUserOffline.bind(this));
    this.eventEmitter.on(
      'user.joined.travel',
      this.handleUserJoinedTravel.bind(this),
    );
    this.eventEmitter.on(
      'user.left.travel',
      this.handleUserLeftTravel.bind(this),
    );
    this.eventEmitter.on(
      'user.joined.planet',
      this.handleUserJoinedPlanet.bind(this),
    );
    this.eventEmitter.on(
      'user.left.planet',
      this.handleUserLeftPlanet.bind(this),
    );

    // 메시지 관련 이벤트
    this.eventEmitter.on(
      'message.created',
      this.handleMessageCreated.bind(this),
    );
    this.eventEmitter.on(
      'message.updated',
      this.handleMessageUpdated.bind(this),
    );
    this.eventEmitter.on(
      'message.deleted',
      this.handleMessageDeleted.bind(this),
    );

    this.logger.log('Cache event listeners initialized');
  }

  /**
   * 캐시 이벤트 발행
   */
  async emitCacheEvent(event: CacheEvent): Promise<void> {
    try {
      const eventName = `cache.${event.entity}.${event.type}`;
      this.eventEmitter.emit(eventName, event);

      this.logger.debug(
        `Cache event emitted: ${eventName} for ${event.entity}:${event.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit cache event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Travel 이벤트 핸들러
  private async handleTravelCreated(data: {
    travelId: number;
    travel: any;
  }): Promise<void> {
    try {
      // Travel 정보 캐시
      const cachedTravel = this.travelCacheService.travelEntityToCache(
        data.travel,
      );
      await this.travelCacheService.setTravelInfo(data.travelId, cachedTravel);

      this.logger.debug(`Travel ${data.travelId} cache updated after creation`);
    } catch (error) {
      this.logger.warn(
        `Failed to handle travel created event: ${error.message}`,
      );
    }
  }

  private async handleTravelUpdated(data: {
    travelId: number;
    travel: any;
    changes: string[];
  }): Promise<void> {
    try {
      // Travel 캐시 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      // 새로운 정보로 캐시 업데이트
      const cachedTravel = this.travelCacheService.travelEntityToCache(
        data.travel,
      );
      await this.travelCacheService.setTravelInfo(data.travelId, cachedTravel);

      // 멤버 목록에 영향을 주는 변경사항인 경우 멤버 캐시도 무효화
      if (
        data.changes.includes('memberCount') ||
        data.changes.includes('status')
      ) {
        // Travel 멤버들의 관련 캐시 무효화
        const onlineMembers =
          await this.travelCacheService.getTravelOnlineMembers(data.travelId);
        // 각 멤버에 대한 추가 캐시 무효화 로직
      }

      this.logger.debug(
        `Travel ${data.travelId} cache updated after changes: ${data.changes.join(', ')}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle travel updated event: ${error.message}`,
      );
    }
  }

  private async handleTravelDeleted(data: { travelId: number }): Promise<void> {
    try {
      // Travel 관련 모든 캐시 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      this.logger.debug(
        `Travel ${data.travelId} cache invalidated after deletion`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle travel deleted event: ${error.message}`,
      );
    }
  }

  private async handleTravelExpired(data: { travelId: number }): Promise<void> {
    try {
      // Travel 및 관련 Planet 캐시 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      // Travel의 Planet들도 캐시 무효화
      const planets = await this.travelCacheService.getTravelPlanets(
        data.travelId,
      );
      if (planets) {
        const planetIds = planets.map((p) => p.id);
        await this.planetCacheService.invalidatePlanetCaches(planetIds);
      }

      this.logger.debug(
        `Travel ${data.travelId} and related caches invalidated after expiry`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle travel expired event: ${error.message}`,
      );
    }
  }

  // Planet 이벤트 핸들러
  private async handlePlanetCreated(data: {
    planetId: number;
    travelId: number;
    planet: any;
  }): Promise<void> {
    try {
      // Planet 정보 캐시
      const cachedPlanet = this.planetCacheService.planetEntityToCache(
        data.planet,
      );
      await this.planetCacheService.setPlanetInfo(data.planetId, cachedPlanet);

      // 소속 Travel 캐시 무효화 (Planet 목록 갱신 필요)
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      this.logger.debug(`Planet ${data.planetId} cache updated after creation`);
    } catch (error) {
      this.logger.warn(
        `Failed to handle planet created event: ${error.message}`,
      );
    }
  }

  private async handlePlanetUpdated(data: {
    planetId: number;
    travelId: number;
    planet: any;
    changes: string[];
  }): Promise<void> {
    try {
      // Planet 캐시 무효화 및 업데이트
      await this.planetCacheService.invalidatePlanetCache(data.planetId);

      const cachedPlanet = this.planetCacheService.planetEntityToCache(
        data.planet,
      );
      await this.planetCacheService.setPlanetInfo(data.planetId, cachedPlanet);

      // Travel 캐시 무효화 (Planet 정보 변경 시)
      if (
        data.changes.includes('status') ||
        data.changes.includes('memberCount')
      ) {
        await this.travelCacheService.invalidateTravelCache(data.travelId);
      }

      this.logger.debug(
        `Planet ${data.planetId} cache updated after changes: ${data.changes.join(', ')}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle planet updated event: ${error.message}`,
      );
    }
  }

  private async handlePlanetDeleted(data: {
    planetId: number;
    travelId: number;
  }): Promise<void> {
    try {
      // Planet 관련 모든 캐시 무효화
      await this.planetCacheService.invalidatePlanetCache(data.planetId);

      // 소속 Travel 캐시도 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      this.logger.debug(
        `Planet ${data.planetId} cache invalidated after deletion`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle planet deleted event: ${error.message}`,
      );
    }
  }

  // 사용자 이벤트 핸들러
  private async handleUserOnline(data: {
    userId: number;
    userInfo: any;
  }): Promise<void> {
    try {
      const onlineInfo = this.onlinePresenceService.userEntityToOnlineInfo(
        data.userInfo,
      );
      await this.onlinePresenceService.setUserOnline(data.userId, onlineInfo);

      this.logger.debug(`User ${data.userId} online status updated`);
    } catch (error) {
      this.logger.warn(`Failed to handle user online event: ${error.message}`);
    }
  }

  private async handleUserOffline(data: { userId: number }): Promise<void> {
    try {
      await this.onlinePresenceService.setUserOffline(data.userId);

      this.logger.debug(`User ${data.userId} offline status updated`);
    } catch (error) {
      this.logger.warn(`Failed to handle user offline event: ${error.message}`);
    }
  }

  private async handleUserJoinedTravel(data: {
    userId: number;
    travelId: number;
  }): Promise<void> {
    try {
      // Travel 멤버 캐시 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      // Travel 온라인 멤버 목록 업데이트
      await this.travelCacheService.addTravelOnlineMember(
        data.travelId,
        data.userId,
      );

      this.logger.debug(
        `User ${data.userId} joined Travel ${data.travelId} - caches updated`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle user joined travel event: ${error.message}`,
      );
    }
  }

  private async handleUserLeftTravel(data: {
    userId: number;
    travelId: number;
  }): Promise<void> {
    try {
      // Travel 멤버 캐시 무효화
      await this.travelCacheService.invalidateTravelCache(data.travelId);

      // Travel 온라인 멤버 목록에서 제거
      await this.travelCacheService.removeTravelOnlineMember(
        data.travelId,
        data.userId,
      );

      this.logger.debug(
        `User ${data.userId} left Travel ${data.travelId} - caches updated`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle user left travel event: ${error.message}`,
      );
    }
  }

  private async handleUserJoinedPlanet(data: {
    userId: number;
    planetId: number;
    travelId?: number;
  }): Promise<void> {
    try {
      // Planet 멤버 캐시 무효화
      await this.planetCacheService.invalidatePlanetCache(data.planetId);

      // Planet 온라인 멤버 목록 업데이트
      await this.planetCacheService.addPlanetOnlineMember(
        data.planetId,
        data.userId,
      );

      // Travel 캐시도 무효화 (Planet 멤버 수 변경)
      if (data.travelId) {
        await this.travelCacheService.invalidateTravelCache(data.travelId);
      }

      this.logger.debug(
        `User ${data.userId} joined Planet ${data.planetId} - caches updated`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle user joined planet event: ${error.message}`,
      );
    }
  }

  private async handleUserLeftPlanet(data: {
    userId: number;
    planetId: number;
    travelId?: number;
  }): Promise<void> {
    try {
      // Planet 멤버 캐시 무효화
      await this.planetCacheService.invalidatePlanetCache(data.planetId);

      // Planet 온라인 멤버 목록에서 제거
      await this.planetCacheService.removePlanetOnlineMember(
        data.planetId,
        data.userId,
      );

      // Travel 캐시도 무효화
      if (data.travelId) {
        await this.travelCacheService.invalidateTravelCache(data.travelId);
      }

      this.logger.debug(
        `User ${data.userId} left Planet ${data.planetId} - caches updated`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle user left planet event: ${error.message}`,
      );
    }
  }

  // 메시지 이벤트 핸들러
  private async handleMessageCreated(data: {
    messageId: number;
    planetId: number;
    message: any;
  }): Promise<void> {
    try {
      // Planet 최근 메시지 캐시 업데이트
      const recentMessage = this.planetCacheService.messageToRecentCache(
        data.message,
      );
      const currentMessages =
        (await this.planetCacheService.getRecentMessages(data.planetId)) || [];
      currentMessages.unshift(recentMessage);

      // 최근 50개 메시지만 유지
      const limitedMessages = currentMessages.slice(0, 50);
      await this.planetCacheService.setRecentMessages(
        data.planetId,
        limitedMessages,
      );

      // Planet 통계 업데이트
      await this.planetCacheService.updatePlanetActivity(data.planetId);

      this.logger.debug(
        `Message ${data.messageId} added to Planet ${data.planetId} cache`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to handle message created event: ${error.message}`,
      );
    }
  }

  private async handleMessageUpdated(data: {
    messageId: number;
    planetId: number;
    message: any;
  }): Promise<void> {
    try {
      // Planet 최근 메시지 캐시에서 해당 메시지 업데이트
      const currentMessages =
        (await this.planetCacheService.getRecentMessages(data.planetId)) || [];
      const messageIndex = currentMessages.findIndex(
        (m) => m.id === data.messageId,
      );

      if (messageIndex >= 0) {
        const updatedMessage = this.planetCacheService.messageToRecentCache(
          data.message,
        );
        currentMessages[messageIndex] = updatedMessage;
        await this.planetCacheService.setRecentMessages(
          data.planetId,
          currentMessages,
        );

        this.logger.debug(
          `Message ${data.messageId} updated in Planet ${data.planetId} cache`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to handle message updated event: ${error.message}`,
      );
    }
  }

  private async handleMessageDeleted(data: {
    messageId: number;
    planetId: number;
  }): Promise<void> {
    try {
      // Planet 최근 메시지 캐시에서 해당 메시지 제거
      const currentMessages =
        (await this.planetCacheService.getRecentMessages(data.planetId)) || [];
      const filteredMessages = currentMessages.filter(
        (m) => m.id !== data.messageId,
      );

      if (filteredMessages.length !== currentMessages.length) {
        await this.planetCacheService.setRecentMessages(
          data.planetId,
          filteredMessages,
        );
        this.logger.debug(
          `Message ${data.messageId} removed from Planet ${data.planetId} cache`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to handle message deleted event: ${error.message}`,
      );
    }
  }

  /**
   * 헬스체크 - 만료된 캐시 정리
   */
  async performHealthCheck(): Promise<void> {
    try {
      // 만료된 온라인 사용자 정리
      await this.onlinePresenceService.cleanupExpiredOnlineUsers();

      this.logger.debug('Cache health check completed');
    } catch (error) {
      this.logger.error(
        `Cache health check failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
