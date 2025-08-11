import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet } from '../../../planet/planet.entity';
import { User } from '../../../user/user.entity';
import { TypingIndicatorService } from '../../services/typing-indicator.service';

/**
 * Typing Status API Controller (v1)
 *
 * Planet 내에서 타이핑 상태 관리 및 분석을 위한 REST API
 *
 * 주요 기능:
 * - Planet별 타이핑 상태 조회
 * - 타이핑 분석 데이터 조회
 * - 타이핑 패턴 통계 제공
 */
@Controller({ path: 'typing', version: '1' })
@UseGuards(AuthGuard)
export class TypingController {
  private readonly logger = new Logger(TypingController.name);

  constructor(
    private readonly typingIndicatorService: TypingIndicatorService,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Planet의 현재 타이핑 상태 조회 API
   * GET /api/v1/typing/planet/:planetId/status
   */
  @Get('planet/:planetId/status')
  async getPlanetTypingStatus(
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

      if (planet.travel) {
        // GROUP Planet: Travel 멤버 확인
        hasAccess = planet.travel.travelUsers.some(
          (tu) => tu.userId === user.id,
        );
      } else {
        // DIRECT Planet: Planet 멤버 확인
        hasAccess = planet.planetUsers.some((pu) => pu.userId === user.id);
      }

      if (!hasAccess) {
        throw new NotFoundException('Planet에 접근할 권한이 없습니다.');
      }

      // 타이핑 상태 조회
      const typingStatus =
        await this.typingIndicatorService.getPlanetTypingUsers(planetId);

      return {
        success: true,
        message: 'Planet 타이핑 상태를 가져왔습니다.',
        data: typingStatus,
      };
    } catch (error) {
      this.logger.error(
        `Get planet typing status failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet의 타이핑 분석 데이터 조회 API
   * GET /api/v1/typing/planet/:planetId/analytics
   */
  @Get('planet/:planetId/analytics')
  async getPlanetTypingAnalytics(
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

      if (planet.travel) {
        // GROUP Planet: Travel 멤버 확인
        hasAccess = planet.travel.travelUsers.some(
          (tu) => tu.userId === user.id,
        );
      } else {
        // DIRECT Planet: Planet 멤버 확인
        hasAccess = planet.planetUsers.some((pu) => pu.userId === user.id);
      }

      if (!hasAccess) {
        throw new NotFoundException('Planet에 접근할 권한이 없습니다.');
      }

      // 타이핑 분석 데이터 조회
      const analytics =
        await this.typingIndicatorService.getTypingAnalytics(planetId);

      return {
        success: true,
        message: 'Planet 타이핑 분석 데이터를 가져왔습니다.',
        data: {
          ...analytics,
          planetInfo: {
            id: planet.id,
            name: planet.name,
            type: planet.type,
          },
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get planet typing analytics failed: planetId=${planetId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 사용자가 특정 Planet에서 타이핑 중인지 확인 API
   * GET /api/v1/typing/planet/:planetId/user/:userId/status
   */
  @Get('planet/:planetId/user/:userId/status')
  async getUserTypingStatus(
    @Param('planetId') planetId: number,
    @Param('userId') targetUserId: number,
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

      if (planet.travel) {
        // GROUP Planet: Travel 멤버 확인
        hasAccess = planet.travel.travelUsers.some(
          (tu) => tu.userId === user.id,
        );
      } else {
        // DIRECT Planet: Planet 멤버 확인
        hasAccess = planet.planetUsers.some((pu) => pu.userId === user.id);
      }

      if (!hasAccess) {
        throw new NotFoundException('Planet에 접근할 권한이 없습니다.');
      }

      // 대상 사용자 조회
      const targetUser = await this.userRepository.findOne({
        where: { id: targetUserId },
        select: ['id', 'name', 'avatar'],
      });

      if (!targetUser) {
        throw new NotFoundException('대상 사용자를 찾을 수 없습니다.');
      }

      // 타이핑 상태 확인
      const isTyping = await this.typingIndicatorService.isUserTyping(
        targetUserId,
        planetId,
      );

      return {
        success: true,
        message: '사용자 타이핑 상태를 확인했습니다.',
        data: {
          planetId,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            avatarUrl: targetUser.avatar,
          },
          isTyping,
          checkedBy: user.id,
          checkedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get user typing status failed: planetId=${planetId}, targetUserId=${targetUserId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 현재 사용자의 모든 Planet에서의 타이핑 상태 조회 API
   * GET /api/v1/typing/my-status
   */
  @Get('my-status')
  async getMyTypingStatus(@Request() req: any) {
    const user: User = req.user;

    try {
      // 사용자가 참여 중인 Planet들에서 타이핑 상태 확인
      // 현재는 간단한 구현으로, 실제로는 사용자가 참여한 모든 Planet을 조회해야 함

      return {
        success: true,
        message: '사용자 타이핑 상태를 가져왔습니다.',
        data: {
          userId: user.id,
          userName: user.name,
          currentlyTyping: [], // 현재 타이핑 중인 Planet들
          recentTypingActivity: [], // 최근 타이핑 활동
          typingStatistics: {
            totalTypingEvents: 0,
            averageTypingDuration: 0,
            mostActiveHours: [],
            preferredTypingType: 'text',
          },
          retrievedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Get my typing status failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 타이핑 상태 강제 정리 API (개발/디버깅용)
   * POST /api/v1/typing/cleanup
   */
  @Post('cleanup')
  async cleanupTypingStates(@Request() req: any) {
    const user: User = req.user;

    try {
      // 만료된 타이핑 상태 정리
      await this.typingIndicatorService.cleanupExpiredTyping();

      this.logger.log(`Typing cleanup triggered by user ${user.id}`);

      return {
        success: true,
        message: '타이핑 상태 정리가 완료되었습니다.',
        data: {
          cleanupTriggeredBy: user.id,
          cleanupAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Typing cleanup failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
