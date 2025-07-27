import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ERROR_MESSAGES,
  SECURITY_CONSTANTS
} from 'src/common/constants/app.constants';

export interface JwtPayload {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) { }

  private readonly JWT_SECRET = process.env.JWT_SECRET;

  /**
   * Access Token 생성
   */
  generateAccessToken(payload: JwtPayload): string {
    try {
      return this.jwtService.sign(
        { id: payload.id, email: payload.email },
        {
          expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || SECURITY_CONSTANTS.DEFAULT_JWT_ACCESS_EXPIRES,
          secret: this.JWT_SECRET,
        }
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
          expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || SECURITY_CONSTANTS.DEFAULT_JWT_REFRESH_EXPIRES,
          secret: this.JWT_SECRET,
        }
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
      }) as JwtPayload;

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
}
