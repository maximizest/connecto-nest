import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../modules/user/user.entity';

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

      // 데이터베이스에서 사용자 정보를 조회하여 role 확인
      const user = await User.findOne({
        where: { id: payload.id },
        select: ['id', 'email', 'role'],
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다');
      }

      // ADMIN 역할 확인
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('관리자 권한이 필요합니다');
      }

      (request as Request & { user: CurrentUserData }).user = payload;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
