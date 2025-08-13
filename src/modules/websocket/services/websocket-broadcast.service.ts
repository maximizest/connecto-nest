import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface BroadcastMessageData {
  messageId: number;
  type: string;
  content?: string;
  senderId: number;
  senderName: string;
  planetId: number;
  travelId?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: Date;
}

export interface TypingData {
  userId: number;
  userName: string;
  planetId: number;
  isTyping: boolean;
}

/**
 * 간소화된 WebSocket 브로드캐스트 서비스
 * 캐시 기능을 제거하고 기본 브로드캐스트 기능만 제공
 */
@Injectable()
export class WebSocketBroadcastService {
  private readonly logger = new Logger(WebSocketBroadcastService.name);

  /**
   * 메시지 브로드캐스트 (간소화 버전)
   */
  async broadcastMessage(
    server: Server,
    messageData: BroadcastMessageData,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${messageData.planetId}`;

      // Planet 룸에 메시지 브로드캐스트
      server.to(planetRoomId).emit('message:new', {
        id: messageData.messageId,
        type: messageData.type,
        content: messageData.content,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        planetId: messageData.planetId,
        fileUrl: messageData.fileUrl,
        fileName: messageData.fileName,
        fileSize: messageData.fileSize,
        createdAt: messageData.createdAt,
        timestamp: new Date().toISOString(),
      });

      // Travel 룸에도 브로드캐스트 (선택적, travelId가 있을 때만)
      if (messageData.travelId) {
        const travelRoomId = `travel:${messageData.travelId}`;
        server.to(travelRoomId).emit('message:new', {
          id: messageData.messageId,
          type: messageData.type,
          content:
            messageData.content?.substring(0, 50) || `[${messageData.type}]`,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          planetId: messageData.planetId,
          createdAt: messageData.createdAt,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `Message broadcasted: id=${messageData.messageId}, planetId=${messageData.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast message: ${error.message}`);
    }
  }

  /**
   * 타이핑 상태 브로드캐스트 (간소화 버전)
   */
  async broadcastTypingStatus(
    server: Server,
    typingData: TypingData,
  ): Promise<void> {
    try {
      const planetRoomId = `planet:${typingData.planetId}`;

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
   * 타이핑 중인 사용자 목록 브로드캐스트 (간소화 버전)
   */
  async broadcastTypingUsers(server: Server, planetId: number): Promise<void> {
    try {
      const planetRoomId = `planet:${planetId}`;

      server.to(planetRoomId).emit('typing:users', {
        planetId,
        typingUsers: [], // 캐시 서비스 제거로 빈 배열 반환
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Typing users list broadcasted for planet ${planetId} (cache disabled)`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast typing users: ${error.message}`);
    }
  }

  /**
   * 온라인 상태 브로드캐스트 (간소화 버전)
   */
  async broadcastOnlineStatus(server: Server, data: any): Promise<void> {
    this.logger.debug(
      'Online status broadcast disabled (cache services removed)',
    );
  }

  /**
   * 읽음 상태 브로드캐스트 (간소화 버전)
   */
  async broadcastReadReceipt(server: Server, data: any): Promise<void> {
    this.logger.debug('Read receipt broadcast not implemented');
  }

  /**
   * 개인 메시지 전송 (간소화 버전)
   */
  async sendPersonalMessage(
    server: Server,
    targetUserId: number,
    eventName: string,
    data: any,
  ): Promise<void> {
    try {
      // 온라인 상태 관리 기능이 제거되어 소켓 관리 불가
      this.logger.debug(
        `Personal message attempted for user ${targetUserId} (socket management disabled)`,
      );
    } catch (error) {
      this.logger.error(`Failed to send personal message: ${error.message}`);
    }
  }

  /**
   * 시스템 알림 브로드캐스트 (간소화 버전)
   */
  async broadcastNotification(
    server: Server,
    notificationData: any,
  ): Promise<void> {
    try {
      // 모든 연결된 클라이언트에게 브로드캐스트
      server.emit('notification:system', {
        ...notificationData,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug('System notification broadcasted to all clients');
    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
    }
  }
}
