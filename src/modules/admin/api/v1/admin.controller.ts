import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
  Get,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnhancedAuthGuard } from '../../../../guards/enhanced-auth.guard';
import { AdminGuard } from '../../../../guards/admin.guard';
import { User } from '../../../user/user.entity';
import { SessionManagerService } from '../../../auth/services/session-manager.service';
import { TokenBlacklistService } from '../../../auth/services/token-blacklist.service';
import { ConnectionManagerService } from '../../../websocket/services/connection-manager.service';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';

/**
 * Admin Controller
 *
 * 관리자 전용 API
 * 강제 로그아웃, 사용자 차단, 세션 관리 등
 */
@Controller({ path: 'admin', version: '1' })
@UseGuards(EnhancedAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly sessionManager: SessionManagerService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 사용자 강제 로그아웃
   */
  @Post('users/:userId/force-logout')
  @HttpCode(HttpStatus.OK)
  async forceLogout(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { reason: string; message?: string },
    @CurrentUser() admin: User,
  ): Promise<any> {
    try {
      // 대상 사용자 확인
      const targetUser = await User.findOne({
        where: { id: userId },
        select: ['id', 'email', 'name', 'role'],
      });

      if (!targetUser) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.',
        };
      }

      // 자기 자신은 강제 로그아웃 불가
      if (targetUser.id === admin.id) {
        return {
          success: false,
          message: '자기 자신은 강제 로그아웃할 수 없습니다.',
        };
      }

      this.logger.log(
        `Force logout initiated: targetUserId=${userId}, adminId=${admin.id}, reason=${body.reason}`,
      );

      // 1. 모든 세션 무효화
      const invalidatedSessions =
        await this.sessionManager.invalidateUserSessions(userId, body.reason);

      // 2. 사용자의 모든 토큰 블랙리스트 추가
      await this.tokenBlacklistService.blacklistUserSessions(
        userId,
        body.reason,
      );

      // 3. 강제 로그아웃 이벤트 발생 (WebSocket 연결 종료)
      this.eventEmitter.emit('user.force.logout', {
        userId,
        reason: body.reason,
        adminId: admin.id,
        timestamp: new Date(),
      });

      // 4. 사용자 테이블에 마지막 강제 로그아웃 시간 기록
      await User.update(userId, {
        lastForcedLogout: new Date(),
      });

      // 5. 감사 로그 기록
      this.eventEmitter.emit('audit.log', {
        action: 'FORCE_LOGOUT',
        adminId: admin.id,
        targetUserId: userId,
        reason: body.reason,
        timestamp: new Date(),
        metadata: {
          invalidatedSessions,
          targetUserEmail: targetUser.email,
        },
      });

      return {
        success: true,
        message: `사용자 ${targetUser.email}의 모든 세션이 종료되었습니다.`,
        data: {
          userId,
          invalidatedSessions,
          timestamp: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(`Force logout failed: ${_error.message}`, _error.stack);
      throw _error;
    }
  }

  /**
   * 사용자 차단
   */
  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body()
    body: {
      reason: string;
      duration?: number; // 차단 기간 (일 단위)
      message?: string;
    },
    @CurrentUser() admin: User,
  ): Promise<any> {
    try {
      // 대상 사용자 확인
      const targetUser = await User.findOne({
        where: { id: userId },
        select: ['id', 'email', 'name', 'role', 'isBanned'],
      });

      if (!targetUser) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.',
        };
      }

      if (targetUser.isBanned) {
        return {
          success: false,
          message: '이미 차단된 사용자입니다.',
        };
      }

      // 자기 자신은 차단 불가
      if (targetUser.id === admin.id) {
        return {
          success: false,
          message: '자기 자신은 차단할 수 없습니다.',
        };
      }

      this.logger.log(
        `User ban initiated: targetUserId=${userId}, adminId=${admin.id}, reason=${body.reason}`,
      );

      // 1. 사용자 차단 상태 업데이트
      const bannedUntil = body.duration
        ? new Date(Date.now() + body.duration * 24 * 60 * 60 * 1000)
        : null;

      await User.update(userId, {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: body.reason,
        bannedBy: admin.id,
        bannedUntil: bannedUntil || undefined,
      });

      // 2. 강제 로그아웃 실행
      await this.forceLogout(
        userId,
        { reason: `차단: ${body.reason}`, message: body.message },
        admin,
      );

      // 3. 차단 이벤트 발생
      this.eventEmitter.emit('user.banned', {
        userId,
        reason: body.reason,
        bannedBy: admin.id,
        duration: body.duration,
        timestamp: new Date(),
      });

      // 4. 감사 로그 기록
      this.eventEmitter.emit('audit.log', {
        action: 'USER_BAN',
        adminId: admin.id,
        targetUserId: userId,
        reason: body.reason,
        timestamp: new Date(),
        metadata: {
          duration: body.duration,
          bannedUntil,
          targetUserEmail: targetUser.email,
        },
      });

      return {
        success: true,
        message: `사용자 ${targetUser.email}가 차단되었습니다.`,
        data: {
          userId,
          bannedUntil,
          reason: body.reason,
          timestamp: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(`User ban failed: ${_error.message}`, _error.stack);
      throw _error;
    }
  }

  /**
   * 사용자 차단 해제
   */
  @Post('users/:userId/unban')
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { reason: string },
    @CurrentUser() admin: User,
  ): Promise<any> {
    try {
      // 대상 사용자 확인
      const targetUser = await User.findOne({
        where: { id: userId },
        select: ['id', 'email', 'name', 'isBanned'],
      });

      if (!targetUser) {
        return {
          success: false,
          message: '사용자를 찾을 수 없습니다.',
        };
      }

      if (!targetUser.isBanned) {
        return {
          success: false,
          message: '차단되지 않은 사용자입니다.',
        };
      }

      this.logger.log(
        `User unban initiated: targetUserId=${userId}, adminId=${admin.id}, reason=${body.reason}`,
      );

      // 1. 차단 상태 해제
      await User.update(userId, {
        isBanned: false,
        bannedAt: undefined,
        bannedReason: undefined,
        bannedBy: undefined,
        bannedUntil: undefined,
      });

      // 2. 블랙리스트에서 제거
      await this.tokenBlacklistService.removeFromBlacklist(userId);

      // 3. 차단 해제 이벤트 발생
      this.eventEmitter.emit('user.unbanned', {
        userId,
        reason: body.reason,
        unbannedBy: admin.id,
        timestamp: new Date(),
      });

      // 4. 감사 로그 기록
      this.eventEmitter.emit('audit.log', {
        action: 'USER_UNBAN',
        adminId: admin.id,
        targetUserId: userId,
        reason: body.reason,
        timestamp: new Date(),
        metadata: {
          targetUserEmail: targetUser.email,
        },
      });

      return {
        success: true,
        message: `사용자 ${targetUser.email}의 차단이 해제되었습니다.`,
        data: {
          userId,
          timestamp: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(`User unban failed: ${_error.message}`, _error.stack);
      throw _error;
    }
  }

  /**
   * 사용자 세션 목록 조회
   */
  @Get('users/:userId/sessions')
  async getUserSessions(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<any> {
    try {
      const sessions = await this.sessionManager.getUserSessions(userId);
      const connectionCount =
        this.connectionManager.getUserConnectionCount(userId);

      return {
        success: true,
        data: {
          userId,
          sessions,
          activeConnections: connectionCount,
          totalSessions: sessions.length,
        },
      };
    } catch (_error) {
      this.logger.error(
        `Get user sessions failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 활성 세션 통계 조회
   */
  @Get('sessions/stats')
  async getSessionStats(): Promise<any> {
    try {
      const sessionStats = await this.sessionManager.getSessionStats();
      const connectionStats = this.connectionManager.getConnectionStats();

      return {
        success: true,
        data: {
          sessions: sessionStats,
          connections: {
            total: connectionStats.totalConnections,
            uniqueUsers: connectionStats.uniqueUsers,
            devices: connectionStats.deviceConnections,
          },
          timestamp: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Get session stats failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 차단된 사용자 목록 조회
   */
  @Get('users/banned')
  async getBannedUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    try {
      const [users, total] = await User.findAndCount({
        where: { isBanned: true },
        select: [
          'id',
          'email',
          'name',
          'bannedAt',
          'bannedReason',
          'bannedBy',
          'bannedUntil',
        ],
        order: { bannedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Get banned users failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }

  /**
   * 특정 디바이스 강제 로그아웃
   */
  @Post('devices/:deviceId/force-disconnect')
  @HttpCode(HttpStatus.OK)
  async forceDisconnectDevice(
    @Param('deviceId') deviceId: string,
    @Body() body: { reason: string },
    @CurrentUser() admin: User,
  ): Promise<any> {
    try {
      this.logger.log(
        `Device force disconnect: deviceId=${deviceId}, adminId=${admin.id}, reason=${body.reason}`,
      );

      const disconnected = await this.connectionManager.forceDisconnectDevice(
        deviceId,
        body.reason,
      );

      // 감사 로그 기록
      this.eventEmitter.emit('audit.log', {
        action: 'DEVICE_DISCONNECT',
        adminId: admin.id,
        deviceId,
        reason: body.reason,
        timestamp: new Date(),
      });

      return {
        success: disconnected,
        message: disconnected
          ? '디바이스 연결이 종료되었습니다.'
          : '활성 연결을 찾을 수 없습니다.',
        data: {
          deviceId,
          disconnected,
          timestamp: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Device disconnect failed: ${_error.message}`,
        _error.stack,
      );
      throw _error;
    }
  }
}
