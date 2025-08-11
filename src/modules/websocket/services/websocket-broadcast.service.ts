import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnlinePresenceService } from '../../cache/services/online-presence.service';
import { PlanetCacheService } from '../../cache/services/planet-cache.service';
import { WebSocketRoomService } from './websocket-room.service';

export interface BroadcastMessageData {
  messageId: number;
  planetId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  type: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: Date;
  isEdited?: boolean;
  editedAt?: Date;
}

export interface TypingData {
  userId: number;
  userName: string;
  planetId: number;
  isTyping: boolean;
}

export interface OnlineStatusData {
  userId: number;
  userName: string;
  isOnline: boolean;
  lastSeenAt?: Date;
  deviceType?: string;
  connectedAt?: Date;
  disconnectedAt?: Date;
}

export interface NotificationData {
  type: 'message' | 'system' | 'travel_expired' | 'planet_created';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

@Injectable()
export class WebSocketBroadcastService {
  private readonly logger = new Logger(WebSocketBroadcastService.name);

  constructor(
    private readonly roomService: WebSocketRoomService,
    private readonly planetCacheService: PlanetCacheService,
    private readonly onlinePresenceService: OnlinePresenceService,
  ) {}

  /**
   * Planet 내 새 메시지 브로드캐스트
   */
  async broadcastNewMessage(
    server: Server,
    messageData: BroadcastMessageData,
    excludeSenderId?: number,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${messageData.planetId}`;
      const roomMembers = this.roomService.getRoomMembers(planetRoomId);

      if (roomMembers.length === 0) {
        this.logger.debug(
          `No online members in planet ${messageData.planetId} for message broadcast`,
        );
        return;
      }

      // 발신자 제외 옵션
      let targetMembers = roomMembers;
      if (excludeSenderId) {
        targetMembers = roomMembers.filter(
          (userId) => userId !== excludeSenderId,
        );
      }

      // 메시지 브로드캐스트
      server.to(planetRoomId).emit('message:new', {
        ...messageData,
        timestamp: new Date().toISOString(),
      });

      // Travel 룸에도 알림 (Planet이 속한 Travel)
      const travelRoomId = await this.getTravelRoomIdFromPlanet(
        messageData.planetId,
      );
      if (travelRoomId) {
        server.to(travelRoomId).emit('planet:new_message', {
          planetId: messageData.planetId,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          messagePreview: this.createMessagePreview(messageData),
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `New message broadcasted to planet ${messageData.planetId} (${targetMembers.length} users)`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast new message: ${error.message}`);
    }
  }

  /**
   * 메시지 편집 브로드캐스트
   */
  async broadcastMessageUpdated(
    server: Server,
    messageData: BroadcastMessageData,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${messageData.planetId}`;

      server.to(planetRoomId).emit('message:updated', {
        ...messageData,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Message update broadcasted to planet ${messageData.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast message update: ${error.message}`);
    }
  }

  /**
   * 메시지 삭제 브로드캐스트
   */
  async broadcastMessageDeleted(
    server: Server,
    messageId: number,
    planetId: number,
    deletedBy: number,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${planetId}`;

      server.to(planetRoomId).emit('message:deleted', {
        messageId,
        planetId,
        deletedBy,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Message deletion broadcasted to planet ${planetId}`);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast message deletion: ${error.message}`,
      );
    }
  }

  /**
   * 타이핑 상태 브로드캐스트
   */
  async broadcastTypingStatus(
    server: Server,
    typingData: TypingData,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${typingData.planetId}`;

      // 타이핑 상태를 캐시에 업데이트
      if (typingData.isTyping) {
        await this.planetCacheService.addTypingUser(
          typingData.planetId,
          typingData.userId,
          typingData.userName,
        );
      } else {
        await this.planetCacheService.removeTypingUser(
          typingData.planetId,
          typingData.userId,
        );
      }

      // 타이핑 상태 브로드캐스트 (타이핑하는 사용자는 제외)
      server
        .to(planetRoomId)
        .except(`user:${typingData.userId}`)
        .emit('typing:status', {
          userId: typingData.userId,
          userName: typingData.userName,
          planetId: typingData.planetId,
          isTyping: typingData.isTyping,
          timestamp: new Date().toISOString(),
        });

      this.logger.debug(
        `Typing status broadcasted for user ${typingData.userId} in planet ${typingData.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast typing status: ${error.message}`);
    }
  }

  /**
   * 온라인 상태 브로드캐스트
   */
  async broadcastOnlineStatus(
    server: Server,
    statusData: OnlineStatusData,
  ): Promise<void> {
    try {
      // 사용자가 참여한 모든 Travel/Planet에 브로드캐스트
      const userRooms = this.roomService.getUserRooms(statusData.userId);

      for (const roomId of userRooms) {
        server.to(roomId).emit('user:online_status', {
          userId: statusData.userId,
          userName: statusData.userName,
          isOnline: statusData.isOnline,
          lastSeenAt: statusData.lastSeenAt,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `Online status broadcasted for user ${statusData.userId} to ${userRooms.length} rooms`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast online status: ${error.message}`);
    }
  }

  /**
   * 시스템 알림 브로드캐스트
   */
  async broadcastNotification(
    server: Server,
    notificationData: NotificationData,
    targetRoomId?: string,
    targetUserId?: number,
  ): Promise<void> {
    try {
      const eventData = {
        ...notificationData,
        timestamp: new Date().toISOString(),
      };

      if (targetUserId) {
        // 특정 사용자에게만 전송
        const userRooms = this.roomService.getUserRooms(targetUserId);
        for (const roomId of userRooms) {
          server.to(roomId).emit('notification', eventData);
        }
        this.logger.debug(`Notification sent to user ${targetUserId}`);
      } else if (targetRoomId) {
        // 특정 룸에만 전송
        server.to(targetRoomId).emit('notification', eventData);
        this.logger.debug(`Notification sent to room ${targetRoomId}`);
      } else {
        // 모든 연결된 사용자에게 전송
        server.emit('notification', eventData);
        this.logger.debug('Global notification sent');
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
    }
  }

  /**
   * Planet 멤버 변경 브로드캐스트 (가입/탈퇴)
   */
  async broadcastPlanetMemberChange(
    server: Server,
    planetId: number,
    userId: number,
    userName: string,
    action: 'joined' | 'left',
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${planetId}`;
      const travelRoomId = await this.getTravelRoomIdFromPlanet(planetId);

      // Planet 룸에 브로드캐스트
      server.to(planetRoomId).emit('planet:member_change', {
        planetId,
        userId,
        userName,
        action,
        timestamp: new Date().toISOString(),
      });

      // Travel 룸에도 알림
      if (travelRoomId) {
        server.to(travelRoomId).emit('planet:member_change', {
          planetId,
          userId,
          userName,
          action,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `Planet member ${action} broadcasted for user ${userId} in planet ${planetId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast planet member change: ${error.message}`,
      );
    }
  }

  /**
   * Travel 만료 알림 브로드캐스트
   */
  async broadcastTravelExpiry(
    server: Server,
    travelId: number,
    travelName: string,
    expiryDate: Date,
  ): Promise<void> {
    try {
      const travelRoomId = `travel:${travelId}`;

      await this.broadcastNotification(
        server,
        {
          type: 'travel_expired',
          title: 'Travel 만료 알림',
          message: `${travelName}이(가) 만료되었습니다.`,
          data: {
            travelId,
            travelName,
            expiryDate: expiryDate.toISOString(),
          },
          timestamp: new Date(),
        },
        travelRoomId,
      );

      this.logger.debug(
        `Travel expiry notification sent for travel ${travelId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast travel expiry: ${error.message}`);
    }
  }

  /**
   * 읽음 확인 브로드캐스트
   */
  async broadcastReadReceipt(
    server: Server,
    planetId: number,
    userId: number,
    userName: string,
    messageId: number,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${planetId}`;

      server.to(planetRoomId).emit('message:read', {
        planetId,
        userId,
        userName,
        messageId,
        readAt: new Date().toISOString(),
      });

      this.logger.debug(
        `Read receipt broadcasted for message ${messageId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast read receipt: ${error.message}`);
    }
  }

  /**
   * 사용자별 개인 메시지 전송
   */
  async sendPersonalMessage(
    server: Server,
    targetUserId: number,
    eventName: string,
    data: any,
  ): Promise<void> {
    try {
      // 사용자의 모든 소켓에 메시지 전송
      const userSockets =
        await this.onlinePresenceService.getUserSockets(targetUserId);

      for (const socketId of userSockets) {
        server.to(socketId).emit(eventName, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `Personal message sent to user ${targetUserId} (${userSockets.length} sockets)`,
      );
    } catch (error) {
      this.logger.error(`Failed to send personal message: ${error.message}`);
    }
  }

  /**
   * 메시지 미리보기 생성
   */
  private createMessagePreview(messageData: BroadcastMessageData): string {
    if (messageData.type === 'TEXT') {
      return messageData.content?.substring(0, 100) || '';
    } else if (messageData.type === 'IMAGE') {
      return '📷 이미지';
    } else if (messageData.type === 'VIDEO') {
      return '🎥 비디오';
    } else if (messageData.type === 'FILE') {
      return `📎 ${messageData.fileName || '파일'}`;
    }
    return '메시지';
  }

  /**
   * Planet에서 Travel 룸 ID 조회
   */
  private async getTravelRoomIdFromPlanet(
    planetId: number,
  ): Promise<string | null> {
    try {
      const planetInfo = await this.planetCacheService.getPlanetInfo(planetId);
      if (planetInfo?.travelId) {
        return `travel:${planetInfo.travelId}`;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to get travel room ID for planet ${planetId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 현재 타이핑 중인 사용자 목록 브로드캐스트
   */
  async broadcastTypingUsers(server: Server, planetId: number): Promise<void> {
    try {
      const typingUsers =
        await this.planetCacheService.getTypingUsers(planetId);
      const planetRoomId = `planet:${planetId}`;

      server.to(planetRoomId).emit('typing:users', {
        planetId,
        typingUsers: typingUsers.map((user) => ({
          userId: user.userId,
          userName: user.userName,
          startedAt: user.startedAt,
        })),
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Typing users list broadcasted for planet ${planetId} (${typingUsers.length} users)`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast typing users: ${error.message}`);
    }
  }

  /**
   * 룸 통계 정보 브로드캐스트
   */
  async broadcastRoomStats(server: Server, roomId: string): Promise<void> {
    try {
      const roomInfo = await this.roomService.getRoomInfo(roomId);
      if (!roomInfo) return;

      server.to(roomId).emit('room:stats', {
        roomId,
        memberCount: roomInfo.memberCount,
        onlineCount: roomInfo.onlineCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Room stats broadcasted for ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast room stats: ${error.message}`);
    }
  }
}
