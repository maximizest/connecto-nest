import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { TokenUtil } from '../common/utils/token.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = TokenUtil.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('토큰이 필요합니다');
    }

    try {
      const payload = await this.jwtService.verifyAsync<CurrentUserData>(
        token,
        {
          secret: process.env.JWT_SECRET,
        },
      );

      (request as Request & { user: CurrentUserData }).user = payload;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return true;
  }
}
