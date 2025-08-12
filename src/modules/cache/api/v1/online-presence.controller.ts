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
import { Planet } from '../../../planet/planet.entity';
import { Travel } from '../../../travel/travel.entity';
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
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
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
        return crudResponse({
          success: false,
          message: '온라인 상태 정보를 찾을 수 없습니다.',
          data: {
            isOnline: false,
            userId: user.id,
          },
        });
      }

      return {
        success: true,
        message: '온라인 상태를 가져왔습니다.',
        data: {
          ...onlineInfo,
          isOnline: true,
        },
      };
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

      return {
        success: true,
        message: '온라인 상태가 성공적으로 업데이트되었습니다.',
        data: {
          userId: user.id,
          currentTravelId,
          currentPlanetId,
          deviceType,
          status,
          lastActivity: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Update online status failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Travel의 온라인 사용자 조회 API
   * GET /api/v1/online-presence/travel/:travelId/users
   */
  @Get('travel/:travelId/users')
  async getTravelOnlineUsers(
    @Param('travelId') travelId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Travel 접근 권한 확인
      const travel = await this.travelRepository.findOne({
        where: { id: travelId },
        relations: ['admin', 'travelUsers'],
      });

      if (!travel) {
        throw new NotFoundException('Travel을 찾을 수 없습니다.');
      }

      // 사용자가 Travel 멤버인지 확인
      const isMember = travel.travelUsers.some((tu) => tu.userId === user.id);
      if (!isMember) {
        throw new NotFoundException('Travel에 접근할 권한이 없습니다.');
      }

      // Travel 온라인 상태 조회
      const totalMembers = travel.travelUsers.length;
      const travelStatus =
        await this.onlinePresenceService.getTravelOnlineStatus(
          travelId,
          travel.name,
          totalMembers,
        );

      return {
        success: true,
        message: 'Travel 온라인 사용자 정보를 가져왔습니다.',
        data: travelStatus,
      };
    } catch (error) {
      this.logger.error(
        `Get travel online users failed: travelId=${travelId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet의 온라인 사용자 조회 API
   * GET /api/v1/online-presence/planet/:planetId/users
   */
  @Get('planet/:planetId/users')
  async getPlanetOnlineUsers(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Planet 접근 권한 확인
      const planet = await this.planetRepository.findOne({
        where: { id: planetId },
        relations: ['travel', 'travel.travelUsers', 'planetUsers'],
      });

      if (!planet) {
        throw new NotFoundException('Planet을 찾을 수 없습니다.');
      }

      // 사용자가 Planet 접근 권한이 있는지 확인
      let hasAccess = false;
      let totalMembers = 0;

      if (planet.travel) {
        // GROUP Planet: Travel 멤버 확인
        hasAccess = planet.travel.travelUsers.some(
          (tu) => tu.userId === user.id,
        );
        totalMembers = planet.travel.travelUsers.length;
      } else {
        // DIRECT Planet: Planet 멤버 확인
        hasAccess = planet.planetUsers.some((pu) => pu.userId === user.id);
        totalMembers = planet.planetUsers.length;
      }

      if (!hasAccess) {
        throw new NotFoundException('Planet에 접근할 권한이 없습니다.');
      }

      // Planet 온라인 상태 조회
      const planetStatus =
        await this.onlinePresenceService.getPlanetOnlineStatus(
          planetId,
          planet.name,
          totalMembers,
          planet.travel?.id,
        );

      return {
        success: true,
        message: 'Planet 온라인 사용자 정보를 가져왔습니다.',
        data: planetStatus,
      };
    } catch (error) {
      this.logger.error(
        `Get planet online users failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Travel과 모든 Planet 온라인 상태 조회 API
   * GET /api/v1/online-presence/travel/:travelId/full-status
   */
  @Get('travel/:travelId/full-status')
  async getTravelFullOnlineStatus(
    @Param('travelId') travelId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Travel 접근 권한 확인
      const travel = await this.travelRepository.findOne({
        where: { id: travelId },
        relations: ['admin', 'travelUsers', 'planets'],
      });

      if (!travel) {
        throw new NotFoundException('Travel을 찾을 수 없습니다.');
      }

      // 사용자가 Travel 멤버인지 확인
      const isMember = travel.travelUsers.some((tu) => tu.userId === user.id);
      if (!isMember) {
        throw new NotFoundException('Travel에 접근할 권한이 없습니다.');
      }

      // Travel과 모든 Planet의 온라인 상태 조회
      const totalMembers = travel.travelUsers.length;
      const planets = travel.planets.map((planet) => ({
        planetId: planet.id,
        planetName: planet.name,
        totalMembers: totalMembers, // GROUP Planet이므로 같은 멤버 수
      }));

      const fullStatus =
        await this.onlinePresenceService.getTravelWithPlanetsOnlineStatus(
          travelId,
          travel.name,
          totalMembers,
          planets,
        );

      return {
        success: true,
        message: 'Travel 전체 온라인 상태 정보를 가져왔습니다.',
        data: fullStatus,
      };
    } catch (error) {
      this.logger.error(
        `Get travel full online status failed: travelId=${travelId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

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

      return {
        success: true,
        message: '사용자 활동 기록을 가져왔습니다.',
        data: {
          userId: user.id,
          totalActivities: activities.length,
          activities: activities,
        },
      };
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

      return {
        success: true,
        message: '전역 온라인 통계를 가져왔습니다.',
        data: {
          ...stats,
          lastUpdated: new Date(),
          detailedStats: globalStats,
        },
      };
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

      return {
        success: true,
        message: '오프라인 상태로 설정되었습니다.',
        data: {
          userId: user.id,
          isOnline: false,
          disconnectedAt: new Date(),
        },
      };
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

      return {
        success: true,
        message: '사용자 온라인 상태를 가져왔습니다.',
        data: {
          userId: targetUserId,
          name: targetUser.name,
          avatarUrl: targetUser.avatar,
          isOnline,
          onlineInfo: onlineInfo
            ? {
                status: onlineInfo.status,
                lastSeenAt: onlineInfo.lastSeenAt,
                deviceType: onlineInfo.deviceType,
                currentTravelId: onlineInfo.currentTravelId,
                currentPlanetId: onlineInfo.currentPlanetId,
                // 민감한 정보는 제외
              }
            : null,
        },
      };
    } catch (error) {
      this.logger.error(
        `Get user online status failed: targetUserId=${targetUserId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet의 타이핑 중인 사용자 조회 API
   * GET /api/v1/online-presence/planet/:planetId/typing
   */
  @Get('planet/:planetId/typing')
  async getPlanetTypingUsers(
    @Param('planetId') planetId: number,
    @Request() req: any,
  ) {
    const user: User = req.user;

    try {
      // Planet 접근 권한 확인 (간단히 구현)
      const planet = await this.planetRepository.findOne({
        where: { id: planetId },
      });

      if (!planet) {
        throw new NotFoundException('Planet을 찾을 수 없습니다.');
      }

      // 타이핑 중인 사용자 목록 조회
      const typingUsers =
        await this.onlinePresenceService.getPlanetTypingUsers(planetId);

      return {
        success: true,
        message: 'Planet 타이핑 사용자 정보를 가져왔습니다.',
        data: {
          planetId,
          typingCount: typingUsers.length,
          typingUsers: typingUsers.map((user) => ({
            userId: user.userId,
            name: user.name,
            avatarUrl: user.avatarUrl,
            deviceType: user.deviceType,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get planet typing users failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
