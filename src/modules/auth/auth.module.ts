import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV_KEYS } from '../../common/constants/app.constants';
import { Profile } from '../profile/profile.entity';
import { User } from '../user/user.entity';
import { PushNotificationService } from '../notification/services/push-notification.service';
import { AuthController } from './api/v1/auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Auth 관련 기본 entities
      User,
      Profile, // 프로필 자동 생성을 위해 필요
    ]),

    // JWT 모듈 설정
    JwtModule.register({
      secret: process.env[ENV_KEYS.JWT_SECRET],
      signOptions: {
        expiresIn: process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] || '1h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PushNotificationService, // 로그인 시 푸시 토큰 등록
  ],
  exports: [
    AuthService,
    JwtModule, // 다른 모듈에서 JWT 사용 가능하도록 export
  ],
})
export class AuthModule {}
