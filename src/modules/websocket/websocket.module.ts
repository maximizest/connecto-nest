import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ENV_KEYS } from '../../common/constants/app.constants';
import { RedisModule } from '../cache/redis.module';
import { Message } from '../message/message.entity';
import { Notification } from '../notification/notification.entity';
import { NotificationService } from '../notification/notification.service';
import { PushNotificationService } from '../notification/services/push-notification.service';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { ReadReceiptModule } from '../read-receipt/read-receipt.module';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { AuthModule } from '../auth/auth.module';
// import { TypingController } from './api/v1/typing.controller'; // 컨트롤러 제거됨
import { ChatGateway } from './chat.gateway';
import { EnhancedWebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import { WebSocketRateLimitGuard } from './guards/rate-limit.guard';
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { RateLimitService } from './services/rate-limit.service';
import { TypingIndicatorService } from './services/typing-indicator.service';
import { WebSocketBroadcastService } from './services/websocket-broadcast.service';
import { WebSocketRoomService } from './services/websocket-room.service';

@Module({
  imports: [
    RedisModule,
    ReadReceiptModule,
    AuthModule, // TokenBlacklistService, SessionManagerService 사용
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      User,
      Travel,
      Planet,
      Message,
      MessageReadReceipt,
      Notification,
      TravelUser,
      PlanetUser,
    ]),
    JwtModule.register({
      secret: process.env[ENV_KEYS.JWT_SECRET],
      signOptions: {
        expiresIn: process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] || '24h',
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1분
        limit: 100, // 1분당 100개 요청
      },
    ]),
  ],
  controllers: [], // TypingController 제거됨
  providers: [
    ChatGateway,
    EnhancedWebSocketGateway,
    WebSocketService,
    ConnectionManagerService,
    WebSocketAuthGuard,
    WebSocketRateLimitGuard,
    WebSocketRoomService,
    WebSocketBroadcastService,
    RateLimitService,
    TypingIndicatorService,
    NotificationService,
    PushNotificationService,
    Reflector,
  ],
  exports: [
    ChatGateway,
    EnhancedWebSocketGateway,
    WebSocketService,
    ConnectionManagerService,
    WebSocketRoomService,
    WebSocketBroadcastService,
    RateLimitService,
    TypingIndicatorService,
  ],
})
export class WebSocketModule {}
