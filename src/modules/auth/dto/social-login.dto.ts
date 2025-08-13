import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SocialProvider } from '../../user/user.entity';

/**
 * 소셜 로그인 요청 DTO
 */
export class SocialLoginDto {
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsString()
  socialToken: string; // 소셜 제공자에서 받은 액세스 토큰

  @IsOptional()
  @IsString()
  deviceId?: string; // 디바이스 식별자 (선택적)

  @IsOptional()
  @IsString()
  fcmToken?: string; // FCM 토큰 (푸시 알림용, 선택적)
}

/**
 * 토큰 갱신 요청 DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

/**
 * 로그아웃 요청 DTO
 */
export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string; // 선택적: refresh token도 함께 무효화

  @IsOptional()
  @IsString()
  deviceId?: string; // 특정 디바이스만 로그아웃 시키는 경우
}
