import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokenUtil } from '../common/utils/token.util';

/**
 * WebSocket 인증 가드
 *
 * WebSocket 연결에 대한 JWT 토큰 검증을 수행합니다.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = TokenUtil.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('인증 토큰이 없습니다.');
      }

      const payload = await this.jwtService.verifyAsync(token);

      // Socket 데이터에 사용자 정보 저장
      client.data.user = payload;

      return true;
    } catch (_error) {
      throw new WsException('인증에 실패했습니다.');
    }
  }
}
