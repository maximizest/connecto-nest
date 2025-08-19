import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ENV_KEYS } from '../../common/constants/app.constants';
import { PushNotificationService } from '../notification/services/push-notification.service';
import { AuthController } from './api/v1/auth.controller';
import { AuthService } from './auth.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { SessionManagerService } from './services/session-manager.service';

@Module({
  imports: [
    // JWT 모듈 설정
    JwtModule.register({
      secret: process.env[ENV_KEYS.JWT_SECRET],
      signOptions: {
        expiresIn: process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] || '1h',
      },
    }),

    // Redis 모듈
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),

    // Event Emitter 모듈
    EventEmitterModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PushNotificationService, // 로그인 시 푸시 토큰 등록
    TokenBlacklistService,
    SessionManagerService,
  ],
  exports: [
    AuthService,
    JwtModule, // 다른 모듈에서 JWT 사용 가능하도록 export
    TokenBlacklistService,
    SessionManagerService,
  ],
})
export class AuthModule {}
