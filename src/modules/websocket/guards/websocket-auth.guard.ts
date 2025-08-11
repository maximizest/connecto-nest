import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { OnlinePresenceService } from '../../cache/services/online-presence.service';
import { User } from '../../user/user.entity';

export interface AuthenticatedSocket extends Socket {
  user: User;
  userId: number;
  authenticated: boolean;
}

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly onlinePresenceService: OnlinePresenceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('인증 토큰이 제공되지 않았습니다.');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new WsException('사용자를 찾을 수 없습니다.');
      }

      if (user.isBannedNow()) {
        throw new WsException('차단된 사용자입니다.');
      }

      // 사용자 정보를 소켓에 첨부
      client.user = user;
      client.userId = user.id;
      client.authenticated = true;

      // 온라인 상태 업데이트
      await this.updateUserOnlineStatus(user, client.id);

      this.logger.debug(`User ${user.id} authenticated via WebSocket`);
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed: ${error.message}`);
      throw new WsException('인증에 실패했습니다.');
    }
  }

  /**
   * 소켓에서 JWT 토큰 추출
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Query parameter에서 토큰 추출
    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Authorization header에서 토큰 추출
    const authorization = client.handshake.headers.authorization;
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.substring(7);
    }

    // Auth object에서 토큰 추출 (클라이언트에서 설정)
    const tokenFromAuth = client.handshake.auth?.token;
    if (tokenFromAuth) {
      return tokenFromAuth;
    }

    return null;
  }

  /**
   * 사용자 온라인 상태 업데이트
   */
  private async updateUserOnlineStatus(
    user: User,
    socketId: string,
  ): Promise<void> {
    try {
      // 사용자를 온라인으로 설정
      const onlineInfo = this.onlinePresenceService.userEntityToOnlineInfo(
        user,
        [socketId],
      );
      await this.onlinePresenceService.setUserOnline(user.id, onlineInfo);

      // 소켓 연결 추가
      await this.onlinePresenceService.addUserSocket(user.id, socketId);

      this.logger.debug(
        `User ${user.id} online status updated with socket ${socketId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update online status for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * 사용자 오프라인 상태 업데이트
   */
  static async updateUserOfflineStatus(
    userId: number,
    socketId: string,
    onlinePresenceService: OnlinePresenceService,
    logger: Logger,
  ): Promise<void> {
    try {
      // 소켓 연결 제거 (다른 소켓이 있으면 온라인 상태 유지)
      await onlinePresenceService.removeUserSocket(userId, socketId);

      logger.debug(`User ${userId} socket ${socketId} disconnected`);
    } catch (error) {
      logger.warn(
        `Failed to update offline status for user ${userId}: ${error.message}`,
      );
    }
  }
}
