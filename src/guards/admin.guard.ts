import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { Admin } from '../modules/admin/admin.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

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

      // 데이터베이스에서 관리자 존재 여부 확인
      const admin = await Admin.findOne({
        where: { id: payload.id },
        select: ['id', 'email'],
      });

      if (!admin) {
        throw new UnauthorizedException('관리자를 찾을 수 없습니다');
      }

      (request as Request & { user: CurrentUserData }).user = payload;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
