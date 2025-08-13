import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { User } from '../../user/user.entity';

/**
 * 인증 토큰 응답 DTO
 */
export class TokenResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  @IsString()
  tokenType: string = 'Bearer';

  @IsNumber()
  expiresIn: number; // 액세스 토큰 만료 시간 (초)

  @IsDateString()
  expiresAt: Date; // 액세스 토큰 만료 시각

  user: User; // 사용자 정보
}

/**
 * 토큰 갱신 응답 DTO
 */
export class RefreshTokenResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  tokenType: string = 'Bearer';

  @IsNumber()
  expiresIn: number; // 액세스 토큰 만료 시간 (초)

  @IsDateString()
  expiresAt: Date; // 액세스 토큰 만료 시각

  @IsOptional()
  @IsString()
  refreshToken?: string; // 새로운 refresh token (선택적으로 갱신)
}
