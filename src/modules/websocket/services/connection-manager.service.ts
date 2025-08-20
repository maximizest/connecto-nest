import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { Socket } from 'socket.io';

/**
 * WebSocket Connection Manager Service
 *
 * WebSocket 연결 관리 및 강제 종료 기능을 제공합니다.
 */
@Injectable()
export class ConnectionManagerService {
  private readonly logger = new Logger(ConnectionManagerService.name);

  // userId -> Set<Socket> 매핑
  private userConnections: Map<number, Set<Socket>> = new Map();

  // socketId -> userId 매핑 (빠른 조회용)
  private socketToUser: Map<string, number> = new Map();

  // deviceId -> Socket 매핑
  private deviceConnections: Map<string, Socket> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * WebSocket 연결 등록
   */
  registerConnection(userId: number, socket: Socket, deviceId?: string): void {
    try {
      // 사용자별 연결 관리
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(socket);

      // Socket ID to User ID 매핑
      this.socketToUser.set(socket.id, userId);

      // 디바이스별 연결 관리
      if (deviceId) {
        // 기존 디바이스 연결이 있으면 종료
        const existingSocket = this.deviceConnections.get(deviceId);
        if (existingSocket && existingSocket.id !== socket.id) {
          existingSocket.emit('duplicate-connection', {
            message: '다른 기기에서 로그인되어 연결이 종료됩니다.',
            timestamp: new Date(),
          });
          existingSocket.disconnect(true);
        }
        this.deviceConnections.set(deviceId, socket);
        socket.data.deviceId = deviceId;
      }

      socket.data.userId = userId;

      this.logger.log(
        `Connection registered: userId=${userId}, socketId=${socket.id}, deviceId=${deviceId}`,
      );

      // 연결 통계 업데이트
      this.emitConnectionStats();
    } catch (_error) {
      this.logger.error(
        `Failed to register connection: ${_error.message}`,
        _error.stack,
      );
    }
  }

  /**
   * WebSocket 연결 해제
   */
  unregisterConnection(socket: Socket): void {
    try {
      const userId = this.socketToUser.get(socket.id);

      if (userId) {
        // 사용자 연결에서 제거
        const connections = this.userConnections.get(userId);
        if (connections) {
          connections.delete(socket);
          if (connections.size === 0) {
            this.userConnections.delete(userId);
          }
        }

        // Socket-User 매핑 제거
        this.socketToUser.delete(socket.id);
      }

      // 디바이스 연결 제거
      const deviceId = socket.data.deviceId;
      if (deviceId && this.deviceConnections.get(deviceId) === socket) {
        this.deviceConnections.delete(deviceId);
      }

      this.logger.log(
        `Connection unregistered: userId=${userId}, socketId=${socket.id}, deviceId=${deviceId}`,
      );

      // 연결 통계 업데이트
      this.emitConnectionStats();
    } catch (_error) {
      this.logger.error(
        `Failed to unregister connection: ${_error.message}`,
        _error.stack,
      );
    }
  }

  /**
   * 특정 사용자의 모든 WebSocket 연결 강제 종료
   */
  async forceDisconnectUser(
    userId: number,
    reason: string,
    message?: string,
  ): Promise<number> {
    try {
      const connections = this.userConnections.get(userId);

      if (!connections || connections.size === 0) {
        this.logger.log(`No active connections for user: userId=${userId}`);
        return 0;
      }

      const disconnectMessage = {
        type: 'force-disconnect',
        reason,
        message: message || '관리자에 의해 연결이 종료되었습니다.',
        timestamp: new Date(),
      };

      let disconnectedCount = 0;

      for (const socket of connections) {
        try {
          // 클라이언트에 종료 이유 전송
          socket.emit('force-disconnect', disconnectMessage);

          // 연결 종료
          socket.disconnect(true);

          disconnectedCount++;
        } catch (err) {
          this.logger.error(`Failed to disconnect socket: ${err.message}`);
        }
      }

      // 연결 정보 정리
      this.userConnections.delete(userId);

      // Socket-User 매핑 정리
      for (const [socketId, uid] of this.socketToUser.entries()) {
        if (uid === userId) {
          this.socketToUser.delete(socketId);
        }
      }

      // 디바이스 연결 정리
      for (const [deviceId, socket] of this.deviceConnections.entries()) {
        if (socket.data.userId === userId) {
          this.deviceConnections.delete(deviceId);
        }
      }

      this.logger.log(
        `Force disconnected user: userId=${userId}, count=${disconnectedCount}, reason=${reason}`,
      );

      return disconnectedCount;
    } catch (_error) {
      this.logger.error(
        `Failed to force disconnect user: ${_error.message}`,
        _error.stack,
      );
      return 0;
    }
  }

  /**
   * 특정 디바이스의 WebSocket 연결 강제 종료
   */
  async forceDisconnectDevice(
    deviceId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      const socket = this.deviceConnections.get(deviceId);

      if (!socket) {
        this.logger.log(
          `No active connection for device: deviceId=${deviceId}`,
        );
        return false;
      }

      socket.emit('force-disconnect', {
        type: 'force-disconnect',
        reason,
        message: '디바이스 연결이 종료되었습니다.',
        timestamp: new Date(),
      });

      socket.disconnect(true);

      this.logger.log(
        `Force disconnected device: deviceId=${deviceId}, reason=${reason}`,
      );

      return true;
    } catch (_error) {
      this.logger.error(
        `Failed to force disconnect device: ${_error.message}`,
        _error.stack,
      );
      return false;
    }
  }

  /**
   * 사용자 세션 무효화 이벤트 처리
   */
  @OnEvent('user.sessions.invalidated')
  async handleSessionInvalidation(payload: {
    userId: number;
    reason: string;
    invalidatedCount: number;
    timestamp: Date;
  }): Promise<void> {
    const { userId, reason } = payload;
    await this.forceDisconnectUser(
      userId,
      'session_invalidated',
      `세션이 무효화되었습니다: ${reason}`,
    );
  }

  /**
   * 사용자 차단 이벤트 처리
   */
  @OnEvent('user.banned')
  async handleUserBanned(payload: {
    userId: number;
    reason: string;
    bannedBy?: number;
    duration?: number;
  }): Promise<void> {
    const { userId, reason } = payload;
    await this.forceDisconnectUser(
      userId,
      'user_banned',
      `계정이 차단되었습니다: ${reason}`,
    );
  }

  /**
   * 강제 로그아웃 이벤트 처리
   */
  @OnEvent('user.force.logout')
  async handleForceLogout(payload: {
    userId: number;
    reason: string;
    adminId?: number;
  }): Promise<void> {
    const { userId, reason } = payload;
    await this.forceDisconnectUser(
      userId,
      'force_logout',
      `강제 로그아웃: ${reason}`,
    );
  }

  /**
   * 사용자의 활성 연결 확인
   */
  isUserConnected(userId: number): boolean {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size > 0 : false;
  }

  /**
   * 사용자의 활성 연결 수 조회
   */
  getUserConnectionCount(userId: number): number {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size : 0;
  }

  /**
   * 모든 활성 연결 통계 조회
   */
  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    deviceConnections: number;
    userConnectionCounts: Map<number, number>;
  } {
    let totalConnections = 0;
    const userConnectionCounts = new Map<number, number>();

    for (const [userId, connections] of this.userConnections.entries()) {
      const count = connections.size;
      totalConnections += count;
      userConnectionCounts.set(userId, count);
    }

    return {
      totalConnections,
      uniqueUsers: this.userConnections.size,
      deviceConnections: this.deviceConnections.size,
      userConnectionCounts,
    };
  }

  /**
   * 특정 사용자에게 메시지 전송
   */
  sendToUser(userId: number, event: string, data: any): boolean {
    const connections = this.userConnections.get(userId);

    if (!connections || connections.size === 0) {
      return false;
    }

    for (const socket of connections) {
      socket.emit(event, data);
    }

    return true;
  }

  /**
   * 특정 디바이스에 메시지 전송
   */
  sendToDevice(deviceId: string, event: string, data: any): boolean {
    const socket = this.deviceConnections.get(deviceId);

    if (!socket) {
      return false;
    }

    socket.emit(event, data);
    return true;
  }

  /**
   * 연결 통계 이벤트 발생
   */
  private emitConnectionStats(): void {
    const stats = this.getConnectionStats();
    this.eventEmitter.emit('websocket.stats', stats);
  }

  /**
   * 정리 작업 (앱 종료 시)
   */
  async cleanup(): Promise<void> {
    try {
      const disconnectMessage = {
        type: 'server-shutdown',
        message: '서버가 재시작됩니다. 잠시 후 다시 연결해주세요.',
        timestamp: new Date(),
      };

      // 모든 연결 종료
      for (const [userId, connections] of this.userConnections.entries()) {
        for (const socket of connections) {
          socket.emit('force-disconnect', disconnectMessage);
          socket.disconnect(true);
        }
      }

      // 모든 맵 정리
      this.userConnections.clear();
      this.socketToUser.clear();
      this.deviceConnections.clear();

      this.logger.log('Connection manager cleaned up');
    } catch (_error) {
      this.logger.error(
        `Failed to cleanup connections: ${_error.message}`,
        _error.stack,
      );
    }
  }
}
