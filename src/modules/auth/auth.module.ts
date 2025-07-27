import { Module } from '@nestjs/common';
import { AuthController } from 'src/modules/auth/api/v1/auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { NaverStrategy } from './strategies/naver.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // 환경변수가 설정된 소셜 로그인 전략만 조건부 등록
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleStrategy]
      : []
    ),
    ...(process.env.KAKAO_CLIENT_ID
      ? [KakaoStrategy]
      : []
    ),
    ...(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
      ? [NaverStrategy]
      : []
    ),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY
      ? [AppleStrategy]
      : []
    ),
  ],
  exports: [AuthService],
})
export class AuthModule { }
