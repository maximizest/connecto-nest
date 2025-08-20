import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { validateRoleBasedPlanetAccess } from '../../../common/helpers/role-based-permission.helper';

import { PlanetUser } from '../../planet-user/planet-user.entity';
import { PlanetUserStatus } from '../../planet-user/enums/planet-user-status.enum';
import { Planet } from '../../planet/planet.entity';
import { PlanetType } from '../../planet/enums/planet-type.enum';
import { PlanetStatus } from '../../planet/enums/planet-status.enum';
import { TravelUser } from '../../travel-user/travel-user.entity';
import { TravelUserStatus } from '../../travel-user/enums/travel-user-status.enum';
import { Travel } from '../../travel/travel.entity';
import { TravelStatus } from '../../travel/enums/travel-status.enum';
import { AuthenticatedSocket } from '../types/authenticated-socket.interface';
import { RoomInfo } from '../types/room-info.interface';
import { UserRoom } from '../types/user-room.interface';

@Injectable()
export class WebSocketRoomService {
  private readonly logger = new Logger(WebSocketRoomService.name);

  // 사용자별 룸 정보 관리
  private userRooms = new Map<number, UserRoom>();

  // 룸별 온라인 사용자 관리
  private roomMembers = new Map<string, Set<number>>();

  constructor() {}

  /**
   * 사용자가 서버에 연결될 때 초기화
   */
  async handleUserConnection(
    socket: AuthenticatedSocket,
    server: Server,
  ): Promise<void> {
    try {
      const userId = socket.userId;

      // 사용자 룸 정보 초기화
      this.userRooms.set(userId, {
        userId,
        rooms: new Set(),
        socket,
      });

      // 사용자가 참여할 수 있는 Travel/Planet 룸에 자동 가입
      await this.joinUserToAuthorizedRooms(socket, server);

      this.logger.debug(`User ${userId} connected and joined authorized rooms`);
    } catch (_error) {
      this.logger.error(
        `Failed to handle user connection for ${socket.userId}: ${_error.message}`,
      );
    }
  }

  /**
   * 사용자가 서버에서 연결해제될 때 정리
   */
  async handleUserDisconnection(
    socket: AuthenticatedSocket,
    server: Server,
  ): Promise<void> {
    try {
      const userId = socket.userId;
      const userRoom = this.userRooms.get(userId);

      if (userRoom) {
        // 모든 룸에서 탈퇴
        for (const roomId of userRoom.rooms) {
          await this.leaveRoom(socket, roomId, server);
        }

        // 사용자 룸 정보 제거
        this.userRooms.delete(userId);
      }

      this.logger.debug(`User ${userId} disconnected and left all rooms`);
    } catch (_error) {
      this.logger.error(
        `Failed to handle user disconnection for ${socket.userId}: ${_error.message}`,
      );
    }
  }

  /**
   * 사용자를 인증된 룸들에 자동 가입
   */
  private async joinUserToAuthorizedRooms(
    socket: AuthenticatedSocket,
    server: Server,
  ): Promise<void> {
    const userId = socket.userId;

    try {
      // 사용자가 속한 Travel들 조회
      const travelUsers = await TravelUser.find({
        where: {
          userId,
          status: TravelUserStatus.ACTIVE,
        },
        relations: ['travel'],
      });

      // Travel 룸들에 가입
      for (const travelUser of travelUsers) {
        if (
          travelUser.travel &&
          travelUser.travel.status === TravelStatus.ACTIVE
        ) {
          const travelRoomId = `travel:${travelUser.travel.id}`;
          await this.joinRoom(socket, travelRoomId, server);
        }
      }

      // 사용자가 속한 Planet들 조회
      const planetUsers = await PlanetUser.find({
        where: {
          userId,
          status: PlanetUserStatus.ACTIVE,
        },
        relations: ['planet'],
      });

      // Planet 룸들에 가입
      for (const planetUser of planetUsers) {
        if (planetUser.planet) {
          // INACTIVE 상태에서도 룸 가입은 가능 (메시지 조회를 위해)
          const planetRoomId = `planet:${planetUser.planet.id}`;
          await this.joinRoom(socket, planetRoomId, server);
        }
      }
    } catch (_error) {
      this.logger.error(
        `Failed to join user ${userId} to authorized rooms: ${_error.message}`,
      );
    }
  }

  /**
   * 특정 룸에 가입
   */
  async joinRoom(
    socket: AuthenticatedSocket,
    roomId: string,
    server: Server,
  ): Promise<boolean> {
    try {
      const userId = socket.userId;
      const userRoom = this.userRooms.get(userId);

      if (!userRoom) {
        this.logger.warn(`User ${userId} not found in userRooms`);
        return false;
      }

      // 권한 확인
      const hasPermission = await this.checkRoomPermission(userId, roomId);
      if (!hasPermission) {
        this.logger.warn(
          `User ${userId} has no permission to join room ${roomId}`,
        );
        return false;
      }

      // Socket.IO 룸에 가입
      await socket.join(roomId);

      // 사용자 룸 정보 업데이트
      userRoom.rooms.add(roomId);

      // 룸 멤버 정보 업데이트
      if (!this.roomMembers.has(roomId)) {
        this.roomMembers.set(roomId, new Set());
      }
      this.roomMembers.get(roomId)!.add(userId);

      // 캐시 업데이트
      await this.updateRoomOnlineCount(roomId);

      // 룸의 다른 멤버들에게 사용자 입장 알림
      socket.to(roomId).emit('user:joined', {
        userId,
        userName: socket.user.name,
        roomId,
        timestamp: new Date().toISOString(),
      });

      // 사용자 위치 업데이트
      const { type, entityId } = this.parseRoomId(roomId);
      this.logger.debug(`User ${userId} joined ${type} room ${entityId}`);

      this.logger.debug(`User ${userId} joined room ${roomId}`);
      return true;
    } catch (_error) {
      this.logger.error(
        `Failed to join room ${roomId} for user ${socket.userId}: ${_error.message}`,
      );
      return false;
    }
  }

  /**
   * 특정 룸에서 탈퇴
   */
  async leaveRoom(
    socket: AuthenticatedSocket,
    roomId: string,
    server: Server,
  ): Promise<boolean> {
    try {
      const userId = socket.userId;
      const userRoom = this.userRooms.get(userId);

      if (!userRoom) {
        return false;
      }

      // Socket.IO 룸에서 탈퇴
      await socket.leave(roomId);

      // 사용자 룸 정보 업데이트
      userRoom.rooms.delete(roomId);

      // 룸 멤버 정보 업데이트
      const roomMemberSet = this.roomMembers.get(roomId);
      if (roomMemberSet) {
        roomMemberSet.delete(userId);
        if (roomMemberSet.size === 0) {
          this.roomMembers.delete(roomId);
        }
      }

      // 캐시 업데이트
      await this.updateRoomOnlineCount(roomId);

      // 룸의 다른 멤버들에게 사용자 퇴장 알림
      socket.to(roomId).emit('user:left', {
        userId,
        userName: socket.user.name,
        roomId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`User ${userId} left room ${roomId}`);
      return true;
    } catch (_error) {
      this.logger.error(
        `Failed to leave room ${roomId} for user ${socket.userId}: ${_error.message}`,
      );
      return false;
    }
  }

  /**
   * 룸 권한 확인 (역할 기반)
   */
  private async checkRoomPermission(
    userId: number,
    roomId: string,
  ): Promise<boolean> {
    try {
      const { type, entityId } = this.parseRoomId(roomId);

      if (type === 'travel') {
        const travelUser = await TravelUser.findOne({
          where: {
            userId,
            travelId: entityId,
            status: TravelUserStatus.ACTIVE,
          },
          relations: ['travel'],
        });

        return travelUser?.travel?.status === TravelStatus.ACTIVE || false;
      } else if (type === 'planet') {
        // Planet 룸의 경우 역할 기반 권한 확인 사용
        try {
          await validateRoleBasedPlanetAccess(entityId, userId);
          return true;
        } catch (_error) {
          this.logger.debug(
            `User ${userId} does not have permission for planet ${entityId}: ${_error.message}`,
          );
          return false;
        }
      }

      return false;
    } catch (_error) {
      this.logger.warn(
        `Failed to check room permission for user ${userId} in room ${roomId}: ${_error.message}`,
      );
      return false;
    }
  }

  /**
   * 룸 ID 파싱
   */
  private parseRoomId(roomId: string): {
    type: 'travel' | 'planet';
    entityId: number;
  } {
    const [type, id] = roomId.split(':');
    return {
      type: type as 'travel' | 'planet',
      entityId: parseInt(id),
    };
  }

  /**
   * 룸 온라인 사용자 수 업데이트
   */
  private async updateRoomOnlineCount(roomId: string): Promise<void> {
    try {
      const { type, entityId } = this.parseRoomId(roomId);
      const onlineCount = this.roomMembers.get(roomId)?.size || 0;

      this.logger.debug(
        `Updated ${type} ${entityId} online count: ${onlineCount}`,
      );
    } catch (_error) {
      this.logger.warn(
        `Failed to update room online count for ${roomId}: ${_error.message}`,
      );
    }
  }

  /**
   * 사용자가 참여한 룸 목록 조회
   */
  getUserRooms(userId: number): string[] {
    const userRoom = this.userRooms.get(userId);
    return userRoom ? Array.from(userRoom.rooms) : [];
  }

  /**
   * 룸의 온라인 멤버 목록 조회
   */
  getRoomMembers(roomId: string): number[] {
    const members = this.roomMembers.get(roomId);
    return members ? Array.from(members) : [];
  }

  /**
   * 룸 정보 조회
   */
  async getRoomInfo(roomId: string): Promise<RoomInfo | null> {
    try {
      const { type, entityId } = this.parseRoomId(roomId);
      const onlineCount = this.roomMembers.get(roomId)?.size || 0;

      if (type === 'travel') {
        const travel = await Travel.findOne({
          where: { id: entityId },
        });
        if (!travel) return null;

        // Travel의 실제 멤버 수 계산
        const memberCount = await TravelUser.count({
          where: {
            travelId: entityId,
            status: TravelUserStatus.ACTIVE,
          },
        });

        return {
          id: roomId,
          type: 'travel',
          entityId,
          name: travel.name,
          memberCount,
          onlineCount,
        };
      } else if (type === 'planet') {
        const planet = await Planet.findOne({
          where: { id: entityId },
        });
        if (!planet) return null;

        // Planet의 멤버 수 실시간 계산
        const planetMemberCount = await PlanetUser.count({
          where: {
            planetId: entityId,
            status: PlanetUserStatus.ACTIVE,
          },
        });

        return {
          id: roomId,
          type: 'planet',
          entityId,
          name: planet.name,
          memberCount: planetMemberCount,
          onlineCount,
        };
      }

      return null;
    } catch (_error) {
      this.logger.warn(
        `Failed to get room info for ${roomId}: ${_error.message}`,
      );
      return null;
    }
  }

  /**
   * 모든 활성 룸 목록 조회
   */
  getActiveRooms(): string[] {
    return Array.from(this.roomMembers.keys());
  }

  /**
   * 룸별 통계 정보 조회
   */
  getRoomStats(): {
    [roomId: string]: { memberCount: number; onlineCount: number };
  } {
    const stats: {
      [roomId: string]: { memberCount: number; onlineCount: number };
    } = {};

    for (const [roomId, members] of this.roomMembers.entries()) {
      stats[roomId] = {
        memberCount: members.size,
        onlineCount: members.size, // 현재는 온라인 = 멤버 수
      };
    }

    return stats;
  }
}
