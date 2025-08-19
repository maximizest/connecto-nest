import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import { ConnectionManagerService } from './services/connection-manager.service';
import { TokenBlacklistService } from '../auth/services/token-blacklist.service';
import { SessionManagerService } from '../auth/services/session-manager.service';
import { WebSocketService } from './websocket.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisAdapterService } from './services/redis-adapter.service';

/**
 * Enhanced WebSocket Gateway
 *
 * WebSocket 연결 관리 및 실시간 통신 처리
 * 토큰 블랙리스트 확인 및 강제 연결 종료 지원
 * Redis Adapter를 통한 멀티 레플리카 지원
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class EnhancedWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EnhancedWebSocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly sessionManager: SessionManagerService,
    private readonly webSocketService: WebSocketService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisAdapterService: RedisAdapterService,
  ) {}

  /**
   * Gateway 초기화
   */
  async afterInit(server: Server): Promise<void> {
    this.logger.log('WebSocket Gateway initializing...');

    // Redis Adapter 설정 (멀티 레플리카 지원)
    try {
      await this.redisAdapterService.setupAdapter(server);
      this.logger.log('Redis adapter configured for multi-replica support');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter:', error);
      // Redis Adapter 실패해도 단일 서버로 동작 가능
    }

    // 서버 설정
    server.setMaxListeners(100);

    // Heartbeat 설정 (25초마다 ping)
    const pingInterval = setInterval(() => {
      server.emit('ping');
    }, 25000);

    // 서버 종료 시 정리
    process.on('SIGTERM', () => {
      clearInterval(pingInterval);
      this.connectionManager.cleanup();
    });

    this.logger.log('WebSocket Gateway initialized successfully');
  }

  /**
   * 클라이언트 연결 처리
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      this.logger.log(`Client attempting to connect: ${socket.id}`);

      // 1. 토큰 추출
      const token = this.extractToken(socket);
      if (!token) {
        this.logger.warn(`Connection rejected - No token: ${socket.id}`);
        socket.emit('error', {
          code: 'AUTH_REQUIRED',
          message: '인증 토큰이 필요합니다.',
        });
        socket.disconnect();
        return;
      }

      // 2. 토큰 블랙리스트 확인
      const isBlacklisted =
        await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(
          `Connection rejected - Blacklisted token: ${socket.id}`,
        );
        socket.emit('error', {
          code: 'TOKEN_BLACKLISTED',
          message: '무효화된 토큰입니다. 다시 로그인해주세요.',
        });
        socket.disconnect();
        return;
      }

      // 3. JWT 토큰 검증
      let payload: any;
      try {
        payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
      } catch (error) {
        this.logger.warn(`Connection rejected - Invalid token: ${socket.id}`);
        socket.emit('error', {
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다.',
        });
        socket.disconnect();
        return;
      }

      // 4. 사용자 블랙리스트 확인
      const isUserBlacklisted =
        await this.tokenBlacklistService.isUserBlacklisted(payload.id);
      if (isUserBlacklisted) {
        this.logger.warn(
          `Connection rejected - User blacklisted: userId=${payload.id}`,
        );
        socket.emit('error', {
          code: 'USER_BLACKLISTED',
          message: '세션이 무효화되었습니다.',
        });
        socket.disconnect();
        return;
      }

      // 5. 사용자 정보 조회 및 차단 상태 확인
      const user = await User.findOne({
        where: { id: payload.id },
        select: ['id', 'email', 'name', 'role', 'isBanned'],
      });

      if (!user) {
        this.logger.warn(
          `Connection rejected - User not found: userId=${payload.id}`,
        );
        socket.emit('error', {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.',
        });
        socket.disconnect();
        return;
      }

      if (user.isBanned) {
        this.logger.warn(
          `Connection rejected - User banned: userId=${user.id}`,
        );
        socket.emit('error', {
          code: 'USER_BANNED',
          message: '차단된 계정입니다.',
        });
        socket.disconnect();
        return;
      }

      // 6. 연결 정보 저장
      socket.data.user = user;
      socket.data.token = token;
      socket.data.deviceId = socket.handshake.query.deviceId as string;

      // 7. Connection Manager에 등록
      this.connectionManager.registerConnection(
        user.id,
        socket,
        socket.data.deviceId,
      );

      // 8. 세션 생성/업데이트
      const sessionId = await this.sessionManager.createSession(
        user.id,
        token,
        socket.data.deviceId || socket.id,
        {
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
          platform: socket.handshake.query.platform as string,
        },
      );
      socket.data.sessionId = sessionId;

      // 9. 기본 room 참여
      socket.join(`user:${user.id}`);

      // 10. 연결 성공 알림
      socket.emit('connected', {
        userId: user.id,
        sessionId,
        serverTime: new Date(),
      });

      // 11. 온라인 상태 업데이트
      await this.webSocketService.updateUserOnlineStatus(user.id, true);

      // 12. 연결 이벤트 발생
      this.eventEmitter.emit('websocket.connected', {
        userId: user.id,
        socketId: socket.id,
        deviceId: socket.data.deviceId,
      });

      this.logger.log(
        `Client connected: userId=${user.id}, socketId=${socket.id}, deviceId=${socket.data.deviceId}`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      socket.emit('error', {
        code: 'CONNECTION_ERROR',
        message: '연결 처리 중 오류가 발생했습니다.',
      });
      socket.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const user = socket.data.user;

      if (user) {
        // Connection Manager에서 제거
        this.connectionManager.unregisterConnection(socket);

        // 세션 활동 시간 업데이트
        if (socket.data.sessionId) {
          await this.sessionManager.updateSessionActivity(
            socket.data.sessionId,
          );
        }

        // 사용자가 더 이상 연결되어 있지 않으면 오프라인 처리
        if (!this.connectionManager.isUserConnected(user.id)) {
          await this.webSocketService.updateUserOnlineStatus(user.id, false);
        }

        // 연결 해제 이벤트 발생
        this.eventEmitter.emit('websocket.disconnected', {
          userId: user.id,
          socketId: socket.id,
          deviceId: socket.data.deviceId,
        });

        this.logger.log(
          `Client disconnected: userId=${user.id}, socketId=${socket.id}`,
        );
      } else {
        this.logger.log(`Unknown client disconnected: ${socket.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`, error.stack);
    }
  }

  /**
   * Ping/Pong 처리 (연결 상태 확인)
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket): void {
    socket.emit('pong', { timestamp: new Date() });

    // 세션 활동 시간 업데이트
    if (socket.data.sessionId) {
      this.sessionManager
        .updateSessionActivity(socket.data.sessionId)
        .catch((err) => {
          this.logger.error(
            `Failed to update session activity: ${err.message}`,
          );
        });
    }
  }

  /**
   * 채팅방 참여
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { planetId: number },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    try {
      const user = socket.data.user;
      if (!user) {
        socket.emit('error', {
          code: 'AUTH_REQUIRED',
          message: '인증이 필요합니다.',
        });
        return;
      }

      // 권한 확인 (별도 구현 필요)
      // const hasAccess = await this.checkPlanetAccess(user.id, data.planetId);

      const roomName = `planet:${data.planetId}`;
      socket.join(roomName);

      socket.emit('room-joined', {
        planetId: data.planetId,
        joinedAt: new Date(),
      });

      // 다른 사용자들에게 알림
      socket.to(roomName).emit('user-joined', {
        userId: user.id,
        userName: user.name,
        planetId: data.planetId,
      });

      this.logger.log(
        `User joined room: userId=${user.id}, planetId=${data.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`, error.stack);
      socket.emit('error', {
        code: 'JOIN_ROOM_ERROR',
        message: '채팅방 참여 중 오류가 발생했습니다.',
      });
    }
  }

  /**
   * 채팅방 나가기
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { planetId: number },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    try {
      const user = socket.data.user;
      if (!user) return;

      const roomName = `planet:${data.planetId}`;
      socket.leave(roomName);

      socket.emit('room-left', {
        planetId: data.planetId,
        leftAt: new Date(),
      });

      // 다른 사용자들에게 알림
      socket.to(roomName).emit('user-left', {
        userId: user.id,
        userName: user.name,
        planetId: data.planetId,
      });

      this.logger.log(
        `User left room: userId=${user.id}, planetId=${data.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`, error.stack);
    }
  }

  /**
   * 타이핑 상태 알림
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { planetId: number; isTyping: boolean },
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    try {
      const user = socket.data.user;
      if (!user) return;

      const roomName = `planet:${data.planetId}`;

      socket.to(roomName).emit('user-typing', {
        userId: user.id,
        userName: user.name,
        planetId: data.planetId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      this.logger.error(`Typing event error: ${error.message}`, error.stack);
    }
  }

  /**
   * 토큰 추출 헬퍼
   */
  private extractToken(socket: Socket): string | null {
    // 1. handshake auth에서 확인
    if (socket.handshake.auth?.token) {
      return socket.handshake.auth.token;
    }

    // 2. query parameter에서 확인
    if (socket.handshake.query?.token) {
      return socket.handshake.query.token as string;
    }

    // 3. Authorization 헤더에서 확인
    const authHeader = socket.handshake.headers['authorization'];
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
    }

    return null;
  }

  /**
   * 특정 사용자에게 메시지 전송
   */
  sendToUser(userId: number, event: string, data: any): void {
    this.connectionManager.sendToUser(userId, event, data);
  }

  /**
   * 특정 Planet의 모든 사용자에게 메시지 전송
   */
  sendToPlanet(planetId: number, event: string, data: any): void {
    this.server.to(`planet:${planetId}`).emit(event, data);
  }

  /**
   * 전체 브로드캐스트
   */
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
  }
}
