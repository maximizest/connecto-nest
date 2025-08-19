import {
  Injectable,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Message } from '../message/message.entity';
import { NotificationService } from '../notification/notification.service';
import { Planet } from '../planet/planet.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { ReadReceiptService } from '../read-receipt/read-receipt.service';
import { User } from '../user/user.entity';
import {
  FileUploadRateLimit,
  MessageSendRateLimit,
  RoomJoinRateLimit,
  TypingRateLimit,
  WebSocketRateLimitGuard,
} from './guards/rate-limit.guard';
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { AuthenticatedSocket } from './types/authenticated-socket.interface';
import { RateLimitService } from './services/rate-limit.service';
import { TypingIndicatorService } from './services/typing-indicator.service';
import { WebSocketBroadcastService } from './services/websocket-broadcast.service';
import { WebSocketRoomService } from './services/websocket-room.service';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { MarkAllReadDto } from './dto/mark-all-read.dto';
import { MarkMessageReadDto } from './dto/mark-message-read.dto';
import { MarkMultipleReadDto } from './dto/mark-multiple-read.dto';
import { ReadMessageDto } from './dto/read-message.dto';
import { RestoreMessageDto } from './dto/restore-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { RedisAdapterService } from './services/redis-adapter.service';

// WebSocket 예외 필터
@Injectable()
class WebSocketExceptionFilter {
  private readonly logger = new Logger(WebSocketExceptionFilter.name);

  catch(exception: any, host: any) {
    const client = host.switchToWs().getClient();
    this.logger.error(`WebSocket error: ${exception.message}`, exception.stack);

    client.emit('error', {
      message: exception.message || '서버 오류가 발생했습니다.',
      timestamp: new Date().toISOString(),
    });
  }
}

@UseFilters(new WebSocketExceptionFilter())
@UsePipes(new ValidationPipe({ transform: true }))
@UseGuards(ThrottlerGuard)
@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL]
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly authGuard: WebSocketAuthGuard,
    private readonly roomService: WebSocketRoomService,
    private readonly broadcastService: WebSocketBroadcastService,
    private readonly rateLimitService: RateLimitService,
    private readonly typingIndicatorService: TypingIndicatorService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly readReceiptService: ReadReceiptService,
    private readonly redisAdapterService: RedisAdapterService,
  ) {}

  /**
   * Gateway 초기화 - Redis Adapter 설정
   */
  async afterInit(server: Server): Promise<void> {
    this.logger.log('ChatGateway initializing...');

    // Redis Adapter 설정 (멀티 레플리카 지원)
    try {
      await this.redisAdapterService.setupAdapter(server);
      this.logger.log('Redis adapter configured for multi-replica support');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter:', error);
      // Redis Adapter 실패해도 단일 서버로 동작 가능
    }

    this.logger.log('ChatGateway initialized successfully');
  }

  /**
   * 클라이언트 연결 처리
   */
  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);

      // 인증 처리
      await this.authGuard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as any);

      const authenticatedClient = client as AuthenticatedSocket;

      // 룸 서비스에 사용자 등록
      await this.roomService.handleUserConnection(
        authenticatedClient,
        this.server,
      );

      // 연결 성공 이벤트 발송
      client.emit('connected', {
        userId: authenticatedClient.userId,
        userName: authenticatedClient.user.name,
        timestamp: new Date().toISOString(),
        rooms: this.roomService.getUserRooms(authenticatedClient.userId),
      });

      // 온라인 상태 추적 제거됨

      this.logger.log(
        `User ${authenticatedClient.userId} connected via WebSocket`,
      );
    } catch (error) {
      this.logger.error(
        `Connection failed for client ${client.id}: ${error.message}`,
      );
      client.emit('auth_error', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      client.disconnect(true);
    }
  }

  /**
   * 클라이언트 연결해제 처리
   */
  async handleDisconnect(client: Socket) {
    try {
      const authenticatedClient = client as AuthenticatedSocket;

      if (authenticatedClient.userId) {
        // 룸 서비스에서 사용자 제거
        await this.roomService.handleUserDisconnection(
          authenticatedClient,
          this.server,
        );

        // 온라인 상태 추적 제거됨

        this.logger.log(
          `User ${authenticatedClient.userId} disconnected from WebSocket`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling disconnection for client ${client.id}: ${error.message}`,
      );
    }
  }

  /**
   * 메시지 전송 처리
   */
  @UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
  @MessageSendRateLimit()
  @FileUploadRateLimit()
  @Throttle({ default: { limit: 10, ttl: 10000 } }) // 10초당 10개 메시지
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    try {
      const userId = client.userId;
      const { planetId, type, content, fileUrl, fileName, fileSize } = data;

      // Planet 권한 확인 (시간 제한, 활성 상태 등)
      const planet = await Planet.findOne({
        where: { id: planetId },
        relations: ['travel'],
      });

      if (!planet) {
        throw new Error('Planet을 찾을 수 없습니다.');
      }

      if (planet.travel && planet.travel.isExpired()) {
        throw new Error(
          '만료된 Travel의 Planet에는 메시지를 보낼 수 없습니다.',
        );
      }

      if (!planet.isChatAllowed()) {
        const nextChatTime = planet.getNextChatTime();
        throw new Error(
          `현재는 채팅할 수 있는 시간이 아닙니다. 다음 채팅 가능 시간: ${nextChatTime?.toLocaleString('ko-KR') || 'N/A'}`,
        );
      }

      // 메시지 생성
      const messageData: any = {
        planetId,
        senderId: userId,
        type: type.toUpperCase() as any, // MessageType enum에 맞게 대문자로 변환
        status: 'SENT' as any,
      };

      // 텍스트 메시지인 경우
      if (type === 'TEXT' && content) {
        messageData.content = content;
      }

      // 파일 메시지인 경우 fileMetadata 구조 생성
      if (type !== 'TEXT' && fileUrl) {
        messageData.fileMetadata = {
          url: fileUrl,
          fileName: fileName || 'unknown',
          fileSize: fileSize || 0,
          originalName: fileName || 'unknown',
          mimeType: this.getMimeTypeFromExtension(fileName || ''),
          extension: this.getFileExtension(fileName || ''),
          storageKey: this.getStorageKeyFromUrl(fileUrl),
        };
      }

      const message = Message.create(messageData);

      const savedMessage = (await message.save()) as unknown as Message;

      // 브로드캐스트 데이터 준비
      const broadcastData = {
        messageId: savedMessage.id,
        planetId,
        senderId: userId,
        senderName: client.user.name,
        type: type.toUpperCase(),
        content: savedMessage.content,
        fileUrl: savedMessage.fileMetadata?.url,
        fileName: savedMessage.fileMetadata?.fileName,
        fileSize: savedMessage.fileMetadata?.fileSize,
        createdAt: savedMessage.createdAt,
      };

      // 메시지 브로드캐스트
      await this.broadcastService.broadcastMessage(this.server, broadcastData);

      // 이벤트 발행 (캐시 업데이트용)
      this.eventEmitter.emit('message.created', {
        messageId: savedMessage.id,
        planetId,
        message: savedMessage,
      });

      // 클라이언트에 전송 완료 응답
      client.emit('message:sent', {
        messageId: savedMessage.id,
        tempId: data['tempId'], // 클라이언트에서 보낸 임시 ID
        timestamp: savedMessage.createdAt.toISOString(),
      });

      this.logger.debug(
        `Message ${savedMessage.id} sent to planet ${planetId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      client.emit('message:error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 룸 가입 처리
   */
  @UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
  @RoomJoinRateLimit()
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      const success = await this.roomService.joinRoom(
        client,
        data.roomId,
        this.server,
      );

      client.emit('room:joined', {
        roomId: data.roomId,
        success,
        timestamp: new Date().toISOString(),
      });

      if (success) {
        const roomInfo = await this.roomService.getRoomInfo(data.roomId);
        if (roomInfo) {
          client.emit('room:info', roomInfo);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`);
      client.emit('room:error', {
        roomId: data.roomId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 룸 탈퇴 처리
   */
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveRoomDto,
  ) {
    try {
      const success = await this.roomService.leaveRoom(
        client,
        data.roomId,
        this.server,
      );

      client.emit('room:left', {
        roomId: data.roomId,
        success,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to leave room: ${error.message}`);
      client.emit('room:error', {
        roomId: data.roomId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 메시지 읽음 처리
   */
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ReadMessageDto,
  ) {
    try {
      // 읽음 상태 브로드캐스트
      await this.broadcastService.broadcastReadReceipt(this.server, {
        planetId: data.planetId,
        userId: client.userId,
        userName: client.user.name,
        messageId: data.messageId,
      });

      // Note: 읽음 상태는 MessageReadReceipt 엔티티를 통해 관리됨
      // 현재는 실시간 알림만 처리하며, DB 저장은 별도 API를 통해 처리

      this.logger.debug(
        `Message ${data.messageId} read by user ${client.userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle message read: ${error.message}`);
    }
  }

  /**
   * 사용자 위치 업데이트 처리
   */
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('user:update_location')
  async handleUpdateLocation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: UpdateLocationDto,
  ) {
    try {
      client.emit('location:updated', {
        travelId: data.travelId,
        planetId: data.planetId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Location updated for user ${client.userId}: travel=${data.travelId}, planet=${data.planetId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update location: ${error.message}`);
    }
  }

  /**
   * 현재 타이핑 중인 사용자 목록 조회
   */
  @UseGuards(WebSocketAuthGuard)
  @UseGuards(WebSocketRateLimitGuard)
  @TypingRateLimit()
  @SubscribeMessage('typing:get_users')
  async handleGetTypingUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { planetId: number },
  ) {
    try {
      await this.broadcastService.broadcastTypingUsers(
        this.server,
        data.planetId,
      );
    } catch (error) {
      this.logger.error(`Failed to get typing users: ${error.message}`);
    }
  }

  /**
   * 룸 정보 조회
   */
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('room:get_info')
  async handleGetRoomInfo(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      const roomInfo = await this.roomService.getRoomInfo(data.roomId);

      client.emit('room:info', roomInfo);
    } catch (error) {
      this.logger.error(`Failed to get room info: ${error.message}`);
    }
  }

  /**
   * 서버 상태 조회 (핑)
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 메시지 편집 이벤트 핸들러
   */
  @SubscribeMessage('message:edit')
  @MessageSendRateLimit()
  @UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: EditMessageDto,
  ) {
    try {
      const { messageId, content } = payload;

      this.logger.debug(
        `Message edit request: messageId=${messageId}, userId=${client.user.id}`,
      );

      // 메시지 조회
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        client.emit('error', { message: '메시지를 찾을 수 없습니다.' });
        return;
      }

      // 편집 권한 확인
      if (message.senderId !== client.user.id) {
        client.emit('error', { message: '메시지 편집 권한이 없습니다.' });
        return;
      }

      if (message.deletedAt) {
        client.emit('error', {
          message: '삭제된 메시지는 편집할 수 없습니다.',
        });
        return;
      }

      if (!message.canEdit(client.user.id)) {
        client.emit('error', { message: '메시지 편집 시간이 만료되었습니다.' });
        return;
      }

      // 편집 처리
      if (!message.isEdited) {
        message.originalContent = message.content;
      }

      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      message.updateSearchableText();

      // 메시지 저장
      const updatedMessage = await message.save();

      // Planet 방에 브로드캐스트
      const roomId = `planet_${message.planetId}`;
      this.server.to(roomId).emit('message:edited', {
        messageId: updatedMessage.id,
        content: updatedMessage.content,
        originalContent: updatedMessage.originalContent,
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.editedAt,
        editedBy: {
          id: client.user.id,
          name: client.user.name,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Message edited: id=${messageId}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Message edit failed:', error);
      client.emit('error', { message: '메시지 편집에 실패했습니다.' });
    }
  }

  /**
   * 메시지 삭제 이벤트 핸들러
   */
  @SubscribeMessage('message:delete')
  @MessageSendRateLimit()
  @UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: DeleteMessageDto,
  ) {
    try {
      const { messageId } = payload;

      this.logger.debug(
        `Message delete request: messageId=${messageId}, userId=${client.user.id}`,
      );

      // 메시지 조회
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        client.emit('error', { message: '메시지를 찾을 수 없습니다.' });
        return;
      }

      if (message.deletedAt) {
        client.emit('error', { message: '이미 삭제된 메시지입니다.' });
        return;
      }

      // 삭제 권한 확인 (발신자 또는 관리자)
      const hasDeletePermission = await this.checkDeletePermission(
        message,
        client.user.id,
      );

      if (!hasDeletePermission) {
        client.emit('error', { message: '메시지 삭제 권한이 없습니다.' });
        return;
      }

      // 소프트 삭제 처리
      message.prepareForSoftDelete(client.user.id);
      const deletedMessage = await message.softRemove();

      // Planet 방에 브로드캐스트
      const roomId = `planet_${message.planetId}`;
      this.server.to(roomId).emit('message:deleted', {
        messageId: deletedMessage.id,
        deletedAt: deletedMessage.deletedAt,
        deletedBy: {
          id: client.user.id,
          name: client.user.name,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Message deleted: id=${messageId}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Message delete failed:', error);
      client.emit('error', { message: '메시지 삭제에 실패했습니다.' });
    }
  }

  /**
   * 메시지 복구 이벤트 핸들러
   */
  @SubscribeMessage('message:restore')
  @MessageSendRateLimit()
  @UseGuards(WebSocketAuthGuard, WebSocketRateLimitGuard)
  async handleRestoreMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: RestoreMessageDto,
  ) {
    try {
      const { messageId } = payload;

      this.logger.debug(
        `Message restore request: messageId=${messageId}, userId=${client.user.id}`,
      );

      // 메시지 조회
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['sender', 'planet', 'planet.travel'],
      });

      if (!message) {
        client.emit('error', { message: '메시지를 찾을 수 없습니다.' });
        return;
      }

      if (!message.deletedAt) {
        client.emit('error', { message: '이미 활성화된 메시지입니다.' });
        return;
      }

      // 복구 권한 확인
      const hasRestorePermission = await this.checkDeletePermission(
        message,
        client.user.id,
      );

      if (!hasRestorePermission) {
        client.emit('error', { message: '메시지 복구 권한이 없습니다.' });
        return;
      }

      // 복구 시간 제한 확인 (24시간)
      const deletedHoursAgo =
        (Date.now() - (message.deletedAt?.getTime() || 0)) / (1000 * 60 * 60);

      if (deletedHoursAgo > 24) {
        client.emit('error', {
          message: '삭제된 지 24시간이 넘은 메시지는 복구할 수 없습니다.',
        });
        return;
      }

      // 복구 처리
      const restoredMessage = await message.recover();

      // Planet 방에 브로드캐스트
      const roomId = `planet_${message.planetId}`;
      this.server.to(roomId).emit('message:restored', {
        messageId: restoredMessage.id,
        content: restoredMessage.content,
        deletedAt: restoredMessage.deletedAt,
        restoredBy: {
          id: client.user.id,
          name: client.user.name,
        },
        restoredAt: new Date(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Message restored: id=${messageId}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Message restore failed:', error);
      client.emit('error', { message: '메시지 복구에 실패했습니다.' });
    }
  }

  /**
   * 메시지 읽음 표시 이벤트 핸들러
   */
  @SubscribeMessage('message:read')
  @UseGuards(WebSocketAuthGuard)
  async handleMarkMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkMessageReadDto,
  ) {
    try {
      const { messageId, deviceType, readSource, sessionId } = payload;

      this.logger.debug(
        `Message read request: messageId=${messageId}, userId=${client.user.id}`,
      );

      // 메시지 조회 및 접근 권한 확인
      const message = await Message.findOne({
        where: { id: messageId },
        relations: ['planet'],
      });

      if (!message) {
        client.emit('error', { message: '메시지를 찾을 수 없습니다.' });
        return;
      }

      // 읽음 처리
      const receipt = await this.readReceiptService.markMessageAsRead(
        messageId,
        client.user.id,
        {
          deviceType,
          userAgent: client.handshake.headers['user-agent'],
          readSource,
          sessionId,
        },
      );

      // Planet 방에 읽음 상태 브로드캐스트
      const roomId = `planet_${message.planetId}`;
      this.server.to(roomId).emit('message:read_status', {
        messageId: receipt.messageId,
        userId: client.user.id,
        userName: client.user.name,
        readAt: receipt.readAt,
        deviceType: receipt.deviceType,
        timestamp: new Date().toISOString(),
      });

      // 클라이언트에 성공 응답
      client.emit('message:read_success', {
        messageId: receipt.messageId,
        readAt: receipt.readAt,
        success: true,
      });

      this.logger.log(
        `Message read processed: messageId=${messageId}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Message read failed:', error);
      client.emit('error', { message: '메시지 읽음 처리에 실패했습니다.' });
    }
  }

  /**
   * 여러 메시지 일괄 읽음 표시 이벤트 핸들러
   */
  @SubscribeMessage('messages:read_multiple')
  @UseGuards(WebSocketAuthGuard)
  async handleMarkMultipleMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkMultipleReadDto,
  ) {
    try {
      const { messageIds, deviceType, readSource, sessionId } = payload;

      this.logger.debug(
        `Multiple messages read request: count=${messageIds.length}, userId=${client.user.id}`,
      );

      if (!messageIds || messageIds.length === 0) {
        client.emit('error', { message: 'messageIds가 필요합니다.' });
        return;
      }

      // 일괄 읽음 처리
      const receipts = await this.readReceiptService.markMultipleMessagesAsRead(
        messageIds,
        client.user.id,
        {
          deviceType,
          userAgent: client.handshake.headers['user-agent'],
          readSource,
          sessionId,
        },
      );

      // Planet별로 그룹핑하여 브로드캐스트
      const planetGroups = receipts.reduce(
        (acc, receipt) => {
          if (!acc[receipt.planetId]) {
            acc[receipt.planetId] = [];
          }
          acc[receipt.planetId].push(receipt);
          return acc;
        },
        {} as Record<number, MessageReadReceipt[]>,
      );

      Object.entries(planetGroups).forEach(([planetId, planetReceipts]) => {
        const roomId = `planet_${planetId}`;
        this.server.to(roomId).emit('messages:batch_read_status', {
          planetId: parseInt(planetId),
          messageIds: planetReceipts.map((r) => r.messageId),
          userId: client.user.id,
          userName: client.user.name,
          count: planetReceipts.length,
          readAt: new Date(),
          timestamp: new Date().toISOString(),
        });
      });

      // 클라이언트에 성공 응답
      client.emit('messages:read_multiple_success', {
        processedCount: receipts.length,
        messageIds: receipts.map((r) => r.messageId),
        success: true,
      });

      this.logger.log(
        `Multiple messages read processed: count=${receipts.length}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Multiple messages read failed:', error);
      client.emit('error', { message: '일괄 읽음 처리에 실패했습니다.' });
    }
  }

  /**
   * Planet의 모든 메시지 읽음 표시 이벤트 핸들러
   */
  @SubscribeMessage('planet:read_all')
  @UseGuards(WebSocketAuthGuard)
  async handleMarkAllMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkAllReadDto,
  ) {
    try {
      const { planetId, deviceType, sessionId } = payload;

      this.logger.debug(
        `Planet read all request: planetId=${planetId}, userId=${client.user.id}`,
      );

      // Planet 모든 메시지 읽음 처리
      const result =
        await this.readReceiptService.markAllMessagesAsReadInPlanet(
          planetId,
          client.user.id,
          {
            deviceType,
            userAgent: client.handshake.headers['user-agent'],
            sessionId,
          },
        );

      // Planet 방에 전체 읽음 브로드캐스트
      const roomId = `planet_${planetId}`;
      this.server.to(roomId).emit('planet:all_messages_read', {
        planetId,
        userId: client.user.id,
        userName: client.user.name,
        processedCount: result.processedCount,
        readAt: new Date(),
        timestamp: new Date().toISOString(),
      });

      // 클라이언트에 성공 응답
      client.emit('planet:read_all_success', {
        planetId,
        processedCount: result.processedCount,
        success: true,
      });

      this.logger.log(
        `Planet all messages read processed: planetId=${planetId}, count=${result.processedCount}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Planet read all failed:', error);
      client.emit('error', {
        message: 'Planet 전체 읽음 처리에 실패했습니다.',
      });
    }
  }

  /**
   * Planet 읽지 않은 메시지 카운트 조회 이벤트 핸들러
   */
  @SubscribeMessage('planet:get_unread_count')
  @UseGuards(WebSocketAuthGuard)
  async handleGetPlanetUnreadCount(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    try {
      const { planetId } = payload;

      const unreadCount = await this.readReceiptService.getUnreadCountInPlanet(
        planetId,
        client.user.id,
      );

      client.emit('planet:unread_count', {
        planetId,
        unreadCount,
        userId: client.user.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Unread count retrieved: planetId=${planetId}, count=${unreadCount}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Get unread count failed:', error);
      client.emit('error', {
        message: '읽지 않은 메시지 카운트 조회에 실패했습니다.',
      });
    }
  }

  /**
   * 사용자 모든 Planet 읽지 않은 카운트 조회 이벤트 핸들러
   */
  @SubscribeMessage('user:get_all_unread_counts')
  @UseGuards(WebSocketAuthGuard)
  async handleGetAllUnreadCounts(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const unreadCounts = await this.readReceiptService.getUnreadCountsByUser(
        client.user.id,
      );

      const totalUnreadCount = unreadCounts.reduce(
        (sum, planet) => sum + planet.unreadCount,
        0,
      );

      client.emit('user:all_unread_counts', {
        userId: client.user.id,
        totalPlanets: unreadCounts.length,
        totalUnreadCount,
        planets: unreadCounts,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `All unread counts retrieved: totalCount=${totalUnreadCount}, userId=${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Get all unread counts failed:', error);
      client.emit('error', {
        message: '전체 읽지 않은 카운트 조회에 실패했습니다.',
      });
    }
  }

  /**
   * 고급 타이핑 상태 시작 이벤트 핸들러
   */
  @SubscribeMessage('typing:advanced_start')
  @UseGuards(WebSocketAuthGuard)
  async handleAdvancedTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      planetId: number;
      typingType?: 'text' | 'voice' | 'file' | 'image';
      contentLength?: number;
    },
  ) {
    try {
      const { planetId, typingType = 'text', contentLength = 0 } = payload;

      const deviceType = this.extractDeviceType(
        client.handshake.headers['user-agent'],
      );

      // 고급 타이핑 상태 시작
      const typingInfo = await this.typingIndicatorService.startTyping(
        client.user.id,
        planetId,
        {
          deviceType,
          typingType,
          contentLength,
          sessionId: client.id,
        },
      );

      // Planet 방에 고급 타이핑 상태 브로드캐스트
      const roomId = `planet_${planetId}`;
      client.to(roomId).emit('typing:advanced_started', {
        planetId,
        typingUser: typingInfo,
        timestamp: new Date().toISOString(),
      });

      // 클라이언트에 성공 응답
      client.emit('typing:start_success', {
        planetId,
        typingInfo,
        success: true,
      });

      this.logger.debug(
        `Advanced typing started: userId=${client.user.id}, planetId=${planetId}, type=${typingType}`,
      );
    } catch (error) {
      this.logger.error('Advanced typing start failed:', error);
      client.emit('error', { message: '타이핑 시작에 실패했습니다.' });
    }
  }

  /**
   * 타이핑 상태 업데이트 이벤트 핸들러
   */
  @SubscribeMessage('typing:update')
  @UseGuards(WebSocketAuthGuard)
  async handleTypingUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      planetId: number;
      contentLength?: number;
      typingType?: 'text' | 'voice' | 'file' | 'image';
    },
  ) {
    try {
      const { planetId, contentLength, typingType } = payload;

      // 타이핑 상태 업데이트
      await this.typingIndicatorService.updateTyping(client.user.id, planetId, {
        contentLength,
        typingType,
      });

      // Planet 방에 타이핑 업데이트 브로드캐스트
      const roomId = `planet_${planetId}`;
      client.to(roomId).emit('typing:progress_updated', {
        planetId,
        userId: client.user.id,
        userName: client.user.name,
        contentLength,
        typingType,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Typing updated: userId=${client.user.id}, planetId=${planetId}, length=${contentLength}`,
      );
    } catch (error) {
      this.logger.error('Typing update failed:', error);
    }
  }

  /**
   * 고급 타이핑 상태 중지 이벤트 핸들러
   */
  @SubscribeMessage('typing:advanced_stop')
  @UseGuards(WebSocketAuthGuard)
  async handleAdvancedTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    try {
      const { planetId } = payload;

      // 타이핑 상태 중지
      await this.typingIndicatorService.stopTyping(client.user.id, planetId);

      // Planet 방에 타이핑 중단 브로드캐스트
      const roomId = `planet_${planetId}`;
      client.to(roomId).emit('typing:advanced_stopped', {
        planetId,
        userId: client.user.id,
        userName: client.user.name,
        timestamp: new Date().toISOString(),
      });

      // 클라이언트에 성공 응답
      client.emit('typing:stop_success', {
        planetId,
        success: true,
      });

      this.logger.debug(
        `Advanced typing stopped: userId=${client.user.id}, planetId=${planetId}`,
      );
    } catch (error) {
      this.logger.error('Advanced typing stop failed:', error);
      client.emit('error', { message: '타이핑 중지에 실패했습니다.' });
    }
  }

  /**
   * Planet 타이핑 상태 조회 이벤트 핸들러
   */
  @SubscribeMessage('typing:get_status')
  @UseGuards(WebSocketAuthGuard)
  async handleGetTypingStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    try {
      const { planetId } = payload;

      const typingStatus =
        await this.typingIndicatorService.getPlanetTypingUsers(planetId);

      client.emit('typing:status', {
        ...typingStatus,
        requestedBy: client.user.id,
      });

      this.logger.debug(
        `Typing status retrieved: planetId=${planetId}, count=${typingStatus.length}`,
      );
    } catch (error) {
      this.logger.error('Get typing status failed:', error);
      client.emit('error', { message: '타이핑 상태 조회에 실패했습니다.' });
    }
  }

  /**
   * 타이핑 분석 데이터 조회 이벤트 핸들러
   */
  @SubscribeMessage('typing:get_analytics')
  @UseGuards(WebSocketAuthGuard)
  async handleGetTypingAnalytics(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    try {
      const { planetId } = payload;

      const analytics =
        await this.typingIndicatorService.getTypingAnalytics(planetId);

      client.emit('typing:analytics', {
        ...analytics,
        requestedBy: client.user.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Typing analytics retrieved: planetId=${planetId}`);
    } catch (error) {
      this.logger.error('Get typing analytics failed:', error);
      client.emit('error', { message: '타이핑 분석 조회에 실패했습니다.' });
    }
  }

  /**
   * 기본 타이핑 상태 시작 (하위 호환성)
   */
  @SubscribeMessage('typing:start')
  @UseGuards(WebSocketAuthGuard)
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    // 고급 타이핑으로 위임
    await this.handleAdvancedTypingStart(client, {
      ...payload,
      typingType: 'text',
      contentLength: 0,
    });
  }

  /**
   * 기본 타이핑 상태 중지 (하위 호환성)
   */
  @SubscribeMessage('typing:stop')
  @UseGuards(WebSocketAuthGuard)
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { planetId: number },
  ) {
    // 고급 타이핑으로 위임
    await this.handleAdvancedTypingStop(client, payload);
  }

  // ==============================
  // 알림 관련 WebSocket 이벤트
  // ==============================

  /**
   * WebSocket 알림 전송 이벤트 리스너
   */
  @OnEvent('notification.websocket')
  async handleWebSocketNotification(data: {
    notification: any;
    userId: number;
    event: string;
    data: any;
  }) {
    try {
      const { userId, event, data: notificationData } = data;

      // 사용자에게 알림 전송 시도
      const socketRooms = this.roomService.getUserRooms(userId);
      let notificationSent = false;

      // 사용자가 참여한 룸에서 활성 소켓을 찾아 알림 전송
      for (const roomId of socketRooms) {
        const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
          roomSockets.forEach((socketId) => {
            const socket = this.server.sockets.sockets.get(socketId);
            const authenticatedSocket = socket as any;
            if (socket && authenticatedSocket.userId === userId) {
              socket.emit(event, {
                ...notificationData,
                receivedAt: new Date().toISOString(),
              });
              notificationSent = true;
            }
          });
        }
      }

      if (notificationSent) {
        this.logger.debug(`WebSocket notification sent to user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle WebSocket notification:', error);
    }
  }

  /**
   * 사용자 알림 구독
   */
  @SubscribeMessage('notifications:subscribe')
  @UseGuards(WebSocketAuthGuard)
  async handleNotificationSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // 사용자를 알림 방에 추가
      const notificationRoom = `notifications:${client.user.id}`;
      await client.join(notificationRoom);

      // 알림 구독 완료 전송 (읽음 상태는 더 이상 추적하지 않음)
      client.emit('notifications:subscribed', {
        userId: client.user.id,
        subscribedAt: new Date().toISOString(),
      });

      this.logger.debug(`User ${client.user.id} subscribed to notifications`);
    } catch (error) {
      this.logger.error('Notification subscription failed:', error);
      client.emit('error', { message: '알림 구독에 실패했습니다.' });
    }
  }

  /**
   * 사용자 알림 구독 해제
   */
  @SubscribeMessage('notifications:unsubscribe')
  @UseGuards(WebSocketAuthGuard)
  async handleNotificationUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // 사용자를 알림 방에서 제거
      const notificationRoom = `notifications:${client.user.id}`;
      await client.leave(notificationRoom);

      client.emit('notifications:unsubscribed', {
        userId: client.user.id,
        unsubscribedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `User ${client.user.id} unsubscribed from notifications`,
      );
    } catch (error) {
      this.logger.error('Notification unsubscription failed:', error);
      client.emit('error', { message: '알림 구독 해제에 실패했습니다.' });
    }
  }

  /**
   * 알림 상태 업데이트 (WebSocket)
   * 알림 읽음 상태는 더 이상 추적하지 않으며, 시스템 상태만 관리합니다.
   */
  @SubscribeMessage('notifications:update_status')
  @UseGuards(WebSocketAuthGuard)
  async handleUpdateNotificationStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { notificationId: number },
  ) {
    try {
      const { notificationId } = payload;

      // 알림 조회만 수행 (읽음 처리는 제거됨)
      // NotificationService에 findOne이 private이므로 getUserNotifications 사용
      const { notifications } =
        await this.notificationService.getUserNotifications(client.user.id, {
          limit: 1,
        });

      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.userId !== client.user.id) {
        throw new Error('알림을 찾을 수 없습니다.');
      }

      // 클라이언트에 알림 정보 전송
      client.emit('notifications:status_updated', {
        notificationId: notification.id,
        status: notification.status,
        userId: client.user.id,
        updatedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `Notification ${notificationId} status checked by user ${client.user.id}`,
      );
    } catch (error) {
      this.logger.error('Update notification status failed:', error);
      client.emit('error', { message: '알림 상태 업데이트에 실패했습니다.' });
    }
  }

  /**
   * 알림 목록 조회 (WebSocket)
   * 읽음 상태 대신 전송 상태별로 알림을 조회합니다.
   */
  @SubscribeMessage('notifications:get_list')
  @UseGuards(WebSocketAuthGuard)
  async handleGetNotificationList(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload?: { status?: string; limit?: number },
  ) {
    try {
      const { status = 'DELIVERED', limit = 20 } = payload || {};

      // 사용자의 알림 목록 조회
      const result = await this.notificationService.getUserNotifications(
        client.user.id,
        { limit, page: 1 },
      );

      client.emit('notifications:list', {
        userId: client.user.id,
        notifications: result.notifications,
        count: result.notifications.length,
        total: result.total,
        hasMore: result.hasMore,
        retrievedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `Notifications retrieved for user ${client.user.id}: ${result.notifications.length} items`,
      );
    } catch (error) {
      this.logger.error('Get notification list failed:', error);
      client.emit('error', {
        message: '알림 목록 조회에 실패했습니다.',
      });
    }
  }

  /**
   * 헬퍼 메서드들
   */

  /**
   * User Agent에서 디바이스 타입 추출
   */
  private extractDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else if (ua.includes('tv')) {
      return 'tv';
    } else {
      return 'desktop';
    }
  }

  /**
   * 삭제/복구 권한 확인 (발신자 또는 Planet 관리자)
   */
  private async checkDeletePermission(
    message: Message,
    userId: number,
  ): Promise<boolean> {
    // 발신자는 항상 삭제 가능
    if (message.senderId === userId) {
      return true;
    }

    // 현재는 발신자만 삭제 가능하도록 제한
    // Note: Planet 관리자 권한은 PlanetUser의 role 필드를 통해 구현 예정
    return false;
  }

  /**
   * 파일 확장자에서 MIME 타입 추출
   */
  private getMimeTypeFromExtension(fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();

    const mimeTypes: Record<string, string> = {
      // 이미지
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',

      // 비디오
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      webm: 'video/webm',

      // 파일
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * 파일명에서 확장자 추출
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > -1 ? fileName.substring(lastDotIndex + 1) : '';
  }

  /**
   * URL에서 스토리지 키 추출 (Cloudflare R2용)
   */
  private getStorageKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // leading slash 제거
    } catch {
      return url; // URL 파싱 실패시 원본 반환
    }
  }
}
