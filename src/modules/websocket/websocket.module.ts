import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV_KEYS } from '../../common/constants/app.constants';
import { RedisModule } from '../cache/redis.module';
import { Message } from '../message/message.entity';
import { MessageReadReceipt } from '../message/read-receipt.entity';
import { ReadReceiptService } from '../message/read-receipt.service';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { ChatGateway } from './chat.gateway';
import { WebSocketRateLimitGuard } from './guards/rate-limit.guard';
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { RateLimitService } from './services/rate-limit.service';
import { WebSocketBroadcastService } from './services/websocket-broadcast.service';
import { WebSocketRoomService } from './services/websocket-room.service';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([
      User,
      Travel,
      Planet,
      Message,
      MessageReadReceipt,
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
  providers: [
    ChatGateway,
    WebSocketAuthGuard,
    WebSocketRateLimitGuard,
    WebSocketRoomService,
    WebSocketBroadcastService,
    RateLimitService,
    ReadReceiptService,
    Reflector,
  ],
  exports: [
    ChatGateway,
    WebSocketRoomService,
    WebSocketBroadcastService,
    RateLimitService,
  ],
})
export class WebSocketModule {}
