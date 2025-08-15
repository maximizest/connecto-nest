import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-client';
import {
  ERROR_MESSAGES,
  SECURITY_CONSTANTS,
} from 'src/common/constants/app.constants';
import { SocialProvider } from '../user/user.entity';
import { JwtPayload } from './types/jwt-payload.interface';
import { SocialUserInfo } from './types/social-user-info.interface';
import { TokenPair } from './types/token-pair.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly appleJwksClient: JwksClient;

  constructor(private readonly jwtService: JwtService) {
    // Google OAuth2 클라이언트 초기화
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Apple JWKS 클라이언트 초기화
    this.appleJwksClient = new JwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });
  }

  private readonly JWT_SECRET = process.env.JWT_SECRET;

  /**
   * Access Token 생성
   */
  generateAccessToken(payload: JwtPayload): string {
    try {
      return this.jwtService.sign(
        { id: payload.id, email: payload.email },
        {
          expiresIn:
            process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ||
            SECURITY_CONSTANTS.DEFAULT_JWT_ACCESS_EXPIRES,
          secret: this.JWT_SECRET,
        },
      );
    } catch (error) {
      this.logger.error('Failed to generate access token', error);
      throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
    }
  }

  /**
   * Refresh Token 생성
   */
  generateRefreshToken(payload: JwtPayload): string {
    try {
      return this.jwtService.sign(
        { id: payload.id, email: payload.email },
        {
          expiresIn:
            process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ||
            SECURITY_CONSTANTS.DEFAULT_JWT_REFRESH_EXPIRES,
          secret: this.JWT_SECRET,
        },
      );
    } catch (error) {
      this.logger.error('Failed to generate refresh token', error);
      throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
    }
  }

  /**
   * 토큰 검증 (강화된 에러 처리)
   */
  verifyToken(token: string): JwtPayload {
    try {
      if (!token) {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_NOT_PROVIDED);
      }

      const payload = this.jwtService.verify(token, {
        secret: this.JWT_SECRET,
      });

      // 페이로드 검증
      if (!payload.id || !payload.email) {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_INVALID);
      }

      return payload;
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error.message}`);

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_EXPIRED);
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_INVALID);
      }

      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_NOT_ACTIVE);
      }

      // 이미 UnauthorizedException인 경우 그대로 throw
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 기타 에러
      throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_VERIFICATION_FAILED);
    }
  }

  /**
   * 토큰 쌍 생성 (Access + Refresh)
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    try {
      return {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload),
      };
    } catch (error) {
      this.logger.error('Failed to generate token pair', error);
      throw new Error(ERROR_MESSAGES.TOKEN_GENERATION_FAILED);
    }
  }

  /**
   * Bearer 토큰에서 JWT 추출
   */
  extractBearerToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(ERROR_MESSAGES.BEARER_TOKEN_REQUIRED);
    }

    const token = authHeader.substring(7);
    if (!token) {
      throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_EMPTY);
    }

    return token;
  }

  /**
   * 소셜 로그인 토큰 검증
   */
  async verifySocialToken(
    provider: SocialProvider,
    token: string,
  ): Promise<SocialUserInfo> {
    try {
      switch (provider) {
        case SocialProvider.GOOGLE:
          return await this.verifyGoogleToken(token);
        case SocialProvider.APPLE:
          return await this.verifyAppleToken(token);
        default:
          throw new UnauthorizedException(
            '지원하지 않는 소셜 로그인 제공자입니다.',
          );
      }
    } catch (error) {
      this.logger.error(`소셜 로그인 토큰 검증 실패 (${provider}):`, error);
      throw new UnauthorizedException('소셜 로그인 토큰 검증에 실패했습니다.');
    }
  }

  /**
   * Google ID 토큰 검증
   */
  private async verifyGoogleToken(idToken: string): Promise<SocialUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Google 토큰 페이로드가 없습니다.');
      }

      return {
        socialId: payload.sub,
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'Google User',
      };
    } catch (error) {
      this.logger.error('Google 토큰 검증 실패:', error);
      throw new UnauthorizedException('Google 토큰 검증에 실패했습니다.');
    }
  }

  /**
   * Apple ID 토큰 검증
   */
  private async verifyAppleToken(idToken: string): Promise<SocialUserInfo> {
    try {
      // JWT 디코딩 (헤더만)
      const decodedHeader = jwt.decode(idToken, { complete: true })?.header;
      if (!decodedHeader?.kid) {
        throw new UnauthorizedException('Apple 토큰 헤더가 유효하지 않습니다.');
      }

      // Apple 공개 키 가져오기
      const key = await this.appleJwksClient.getSigningKey(decodedHeader.kid);
      const signingKey = key.getPublicKey();

      // JWT 검증
      const payload = jwt.verify(idToken, signingKey, {
        audience: process.env.APPLE_CLIENT_ID,
        issuer: 'https://appleid.apple.com',
      }) as any;

      return {
        socialId: payload.sub,
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'Apple User',
      };
    } catch (error) {
      this.logger.error('Apple 토큰 검증 실패:', error);
      throw new UnauthorizedException('Apple 토큰 검증에 실패했습니다.');
    }
  }
}
