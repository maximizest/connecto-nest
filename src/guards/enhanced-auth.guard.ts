import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/user/user.entity';
import { TokenBlacklistService } from '../modules/auth/services/token-blacklist.service';

/**
 * Enhanced Auth Guard
 *
 * JWT 토큰 검증 + 블랙리스트 확인 + 사용자 차단 상태 확인
 */
@Injectable()
export class EnhancedAuthGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // 1. 토큰 추출
      const token = this.extractToken(request);
      if (!token) {
        throw new UnauthorizedException('인증 토큰이 없습니다.');
      }

      // 2. 블랙리스트 확인 (빠른 Redis 조회)
      const isBlacklisted =
        await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        const blacklistInfo =
          await this.tokenBlacklistService.getBlacklistInfo(token);
        this.logger.warn(
          `Blacklisted token used: reason=${blacklistInfo?.reason}, userId=${blacklistInfo?.userId}`,
        );
        throw new UnauthorizedException(
          '무효화된 토큰입니다. 다시 로그인해주세요.',
        );
      }

      // 3. JWT 토큰 검증
      let payload: any;
      try {
        payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          throw new UnauthorizedException('토큰이 만료되었습니다.');
        } else if (jwtError.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }
        throw jwtError;
      }

      // 4. 사용자 전체 세션 블랙리스트 확인
      const isUserBlacklisted =
        await this.tokenBlacklistService.isUserBlacklisted(payload.id);
      if (isUserBlacklisted) {
        const userBlacklistInfo =
          await this.tokenBlacklistService.getUserBlacklistInfo(payload.id);
        this.logger.warn(
          `User blacklisted: userId=${payload.id}, reason=${userBlacklistInfo?.reason}`,
        );
        throw new UnauthorizedException(
          '세션이 무효화되었습니다. 다시 로그인해주세요.',
        );
      }

      // 5. 사용자 정보 조회 및 차단 상태 확인
      const user = await this.userRepository.findOne({
        where: { id: payload.id },
        select: [
          'id',
          'email',
          'name',
          'role',
          'isBanned',
          'bannedAt',
          'bannedReason',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      if (user.isBanned) {
        this.logger.warn(
          `Banned user attempted access: userId=${user.id}, bannedAt=${user.bannedAt}, reason=${user.bannedReason}`,
        );
        throw new UnauthorizedException(
          `계정이 차단되었습니다. 사유: ${user.bannedReason || '정책 위반'}`,
        );
      }

      // 6. 요청 객체에 사용자 정보 추가
      request.user = user;
      request.token = token;
      request.tokenPayload = payload;

      // 7. 추가 메타데이터 저장 (로깅 및 감사용)
      request.authMetadata = {
        userId: user.id,
        userRole: user.role,
        tokenIssuedAt: new Date(payload.iat * 1000),
        tokenExpiresAt: new Date(payload.exp * 1000),
        requestTime: new Date(),
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new UnauthorizedException('인증 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * Authorization 헤더에서 Bearer 토큰 추출
   */
  private extractToken(request: any): string | null {
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }
}
