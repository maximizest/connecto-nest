import { crudResponse } from '@foryourdev/nestjs-crud';
import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';

import { User } from '../../../user/user.entity';
import {
  OnlinePresenceService,
  OnlineUserInfo,
} from '../../services/online-presence.service';

/**
 * Online Presence API Controller (v1)
 *
 * Travel/Planet 범위 내에서 사용자 온라인 상태를 관리합니다.
 * 실시간 온라인 상태 조회, 위치 업데이트, 온라인 통계 제공
 *
 * 주요 기능:
 * - 사용자 온라인 상태 업데이트
 * - Travel/Planet별 온라인 사용자 조회
 * - 온라인 상태 통계 및 분석
 * - 사용자 활동 추적
 */
@Controller({ path: 'online-presence', version: '1' })
@UseGuards(AuthGuard)
export class OnlinePresenceController {
  private readonly logger = new Logger(OnlinePresenceController.name);

  constructor(
    private readonly onlinePresenceService: OnlinePresenceService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 현재 사용자의 온라인 상태 조회 API
   * GET /api/v1/online-presence/my-status
   */
  @Get('my-status')
  async getMyOnlineStatus(@Request() req: any) {
    const user: User = req.user;

    try {
      const onlineInfo = await this.onlinePresenceService.getUserOnlineInfo(
        user.id,
      );

      if (!onlineInfo) {
        // Return User entity with offline status
        const offlineUser = Object.assign(new User(), {
          ...user,
          isOnline: false,
          lastSeenAt: new Date(),
        });

        return crudResponse(offlineUser);
      }

      // Return User entity with online info
      const onlineUser = Object.assign(new User(), {
        ...user,
        isOnline: true,
        lastSeenAt: new Date(),
      });

      return crudResponse(onlineUser);
    } catch (error) {
      this.logger.error(
        `Get my online status failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 사용자 온라인 상태 업데이트 API
   * PUT /api/v1/online-presence/update
   */
  @Put('update')
  async updateOnlineStatus(
    @Body()
    body: {
      currentTravelId?: number;
      currentPlanetId?: number;
      deviceType?: string;
      status?: string;
    },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { currentTravelId, currentPlanetId, deviceType, status } = body;

      // 기존 온라인 정보 조회
      let onlineInfo = await this.onlinePresenceService.getUserOnlineInfo(
        user.id,
      );

      if (!onlineInfo) {
        // 새로운 온라인 상태 생성
        onlineInfo = this.onlinePresenceService.userEntityToOnlineInfo(user);
      }

      // 위치 변경이 있는 경우 이전 위치에서 제거
      if (currentTravelId && currentTravelId !== onlineInfo.currentTravelId) {
        if (onlineInfo.currentTravelId) {
          await this.onlinePresenceService.removeUserFromTravel(
            onlineInfo.currentTravelId,
            user.id,
          );
        }
        await this.onlinePresenceService.addUserToTravel(
          currentTravelId,
          user.id,
        );
      }

      if (currentPlanetId && currentPlanetId !== onlineInfo.currentPlanetId) {
        if (onlineInfo.currentPlanetId) {
          await this.onlinePresenceService.removeUserFromPlanet(
            onlineInfo.currentPlanetId,
            user.id,
          );
        }
        await this.onlinePresenceService.addUserToPlanet(
          currentPlanetId,
          user.id,
        );
      }

      // 온라인 상태 업데이트
      const updates: Partial<OnlineUserInfo> = {
        lastActivity: new Date(),
      };

      if (currentTravelId !== undefined)
        updates.currentTravelId = currentTravelId;
      if (currentPlanetId !== undefined)
        updates.currentPlanetId = currentPlanetId;
      if (deviceType) updates.deviceType = deviceType;
      if (status) updates.status = status;

      await this.onlinePresenceService.updateUserOnlineStatus(user.id, updates);

      // 위치 업데이트 기록
      await this.onlinePresenceService.updateUserLocation(
        user.id,
        currentTravelId,
        currentPlanetId,
      );

      this.logger.log(
        `Online status updated: userId=${user.id}, travel=${currentTravelId}, planet=${currentPlanetId}`,
      );

      // Return updated User entity
      const updatedUser = Object.assign(new User(), {
        ...user,
        isOnline: true,
        lastSeenAt: new Date(),
      });

      return crudResponse(updatedUser);
    } catch (error) {
      this.logger.error(
        `Update online status failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  // Travel 온라인 상태는 travel.controller.ts에서 include 사용하여 조회

  // Planet 온라인 상태는 planet.controller.ts에서 include 사용하여 조회

  // Travel 전체 상태는 travel.controller.ts에서 관리

  /**
   * 사용자 활동 기록 조회 API
   * GET /api/v1/online-presence/my-activity
   */
  @Get('my-activity')
  async getMyActivity(@Query('limit') limit: number = 20, @Request() req: any) {
    const user: User = req.user;

    try {
      const activities = await this.onlinePresenceService.getUserActivities(
        user.id,
        Math.min(limit, 50), // 최대 50개로 제한
      );

      // Return User entity with activity data
      const userWithActivity = Object.assign(new User(), {
        ...user,
        metadata: {
          totalActivities: activities.length,
          activities: activities,
          retrievedAt: new Date(),
        },
      });

      return crudResponse(userWithActivity);
    } catch (error) {
      this.logger.error(
        `Get my activity failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 전역 온라인 통계 조회 API
   * GET /api/v1/online-presence/global-stats
   */
  @Get('global-stats')
  async getGlobalOnlineStats(@Request() req: any) {
    const user: User = req.user;

    try {
      const stats = await this.onlinePresenceService.collectOnlineStatistics();
      const globalStats = await this.onlinePresenceService.getGlobalStats();

      // Return User entity with global stats data
      const userWithStats = Object.assign(new User(), {
        ...user,
        metadata: {
          ...stats,
          lastUpdated: new Date(),
          detailedStats: globalStats,
        },
      });

      return crudResponse(userWithStats);
    } catch (error) {
      this.logger.error(
        `Get global online stats failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 온라인 상태 설정 API
   * POST /api/v1/online-presence/set-online
   */
  @Post('set-online')
  async setOnline(
    @Body()
    body: {
      deviceType?: string;
      userAgent?: string;
      currentTravelId?: number;
      currentPlanetId?: number;
    },
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      const { deviceType, userAgent, currentTravelId, currentPlanetId } = body;

      // 온라인 상태 정보 생성
      const onlineInfo = this.onlinePresenceService.userEntityToOnlineInfo(
        user,
        [], // 소켓 ID는 WebSocket에서 관리
      );

      // 추가 정보 설정
      if (deviceType) onlineInfo.deviceType = deviceType;
      if (userAgent) onlineInfo.userAgent = userAgent;
      if (currentTravelId) onlineInfo.currentTravelId = currentTravelId;
      if (currentPlanetId) onlineInfo.currentPlanetId = currentPlanetId;

      // 온라인 상태 설정
      await this.onlinePresenceService.setUserOnline(user.id, onlineInfo);

      // Travel/Planet에 추가
      if (currentTravelId) {
        await this.onlinePresenceService.addUserToTravel(
          currentTravelId,
          user.id,
        );
      }
      if (currentPlanetId) {
        await this.onlinePresenceService.addUserToPlanet(
          currentPlanetId,
          user.id,
        );
      }

      this.logger.log(`User set online: userId=${user.id}`);

      return {
        success: true,
        message: '온라인 상태로 설정되었습니다.',
        data: {
          userId: user.id,
          isOnline: true,
          connectedAt: onlineInfo.connectedAt,
          currentTravelId,
          currentPlanetId,
          deviceType,
        },
      };
    } catch (error) {
      this.logger.error(
        `Set online failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 오프라인 상태 설정 API
   * POST /api/v1/online-presence/set-offline
   */
  @Post('set-offline')
  async setOffline(@Request() req: any) {
    const user: User = req.user;

    try {
      // 모든 Travel/Planet에서 제거
      await this.onlinePresenceService.removeUserFromAllTravelsAndPlanets(
        user.id,
      );

      // 오프라인 상태 설정
      await this.onlinePresenceService.setUserOffline(user.id);

      this.logger.log(`User set offline: userId=${user.id}`);

      // Return User entity with offline status
      const offlineUser = Object.assign(new User(), {
        ...user,
        isOnline: false,
        lastSeenAt: new Date(),
        metadata: {
          disconnectedAt: new Date(),
        },
      });

      return crudResponse(offlineUser);
    } catch (error) {
      this.logger.error(
        `Set offline failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 특정 사용자의 온라인 상태 확인 API
   * GET /api/v1/online-presence/user/:userId/status
   */
  @Get('user/:userId/status')
  async getUserOnlineStatus(
    @Param('userId') targetUserId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // 대상 사용자 조회
      const targetUser = await this.userRepository.findOne({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 온라인 상태 조회
      const onlineInfo =
        await this.onlinePresenceService.getUserOnlineInfo(targetUserId);
      const isOnline =
        await this.onlinePresenceService.isUserOnline(targetUserId);

      // Return target User entity with online status
      const targetUserWithStatus = Object.assign(new User(), {
        ...targetUser,
        isOnline,
        metadata: {
          onlineInfo: onlineInfo
            ? {
                status: onlineInfo.status,
                deviceType: onlineInfo.deviceType,
                currentTravelId: onlineInfo.currentTravelId,
                currentPlanetId: onlineInfo.currentPlanetId,
              }
            : null,
        },
      });

      return crudResponse(targetUserWithStatus);
    } catch (error) {
      this.logger.error(
        `Get user online status failed: targetUserId=${targetUserId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  // Planet 타이핑 사용자는 planet.controller.ts에서 include 사용하여 조회
}
