import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) { }

  private readonly JWT_SECRET = process.env.JWT_SECRET;

  /**
   * Access Token 생성
   */
  generateAccessToken(payload: { id: number; email: string }): string {
    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
      secret: this.JWT_SECRET,
    });
  }

  /**
   * Refresh Token 생성
   */
  generateRefreshToken(payload: { id: number; email: string }): string {
    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
      secret: this.JWT_SECRET,
    });
  }

  /**
   * 토큰 검증
   */
  verifyToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.JWT_SECRET,
    });
  }

  /**
   * 토큰 쌍 생성 (Access + Refresh)
   */
  generateTokenPair(payload: { id: number; email: string }) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}
