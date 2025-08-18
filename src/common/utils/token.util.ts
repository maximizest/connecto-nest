import { Request } from 'express';
import { Socket } from 'socket.io';

/**
 * 토큰 유틸리티
 *
 * JWT 토큰 추출과 관련된 공통 기능을 제공
 */
export class TokenUtil {
  /**
   * HTTP 요청 헤더에서 Bearer 토큰 추출
   */
  static extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * WebSocket 연결에서 토큰 추출
   */
  static extractTokenFromSocket(client: Socket): string | null {
    // 1. handshake auth에서 토큰 추출
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. handshake headers에서 Bearer 토큰 추출
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    // 3. query parameter에서 토큰 추출
    if (client.handshake?.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }

  /**
   * 토큰 유효성 기본 검증 (형식만 확인)
   */
  static isValidTokenFormat(token: string): boolean {
    // JWT 토큰 기본 형식 검증 (3개 부분으로 구성)
    const parts = token.split('.');
    return parts.length === 3;
  }
}
