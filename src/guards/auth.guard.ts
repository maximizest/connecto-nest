import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Request } from 'express';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { TokenUtil } from '../common/utils/token.util';
import { User } from '../modules/user/user.entity';
import { TokenBlacklistService } from '../modules/auth/services/token-blacklist.service';

/**
 * Auth Guard
 *
 * JWT 토큰 검증 + 블랙리스트 확인 + 사용자 차단 상태 확인
 * (기존 EnhancedAuthGuard 기능 통합)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly i18n: I18nService,
  ) {
    // JWT secret을 한 번만 읽어서 캐싱
    this.jwtSecret = process.env.JWT_SECRET || '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // 1. 토큰 추출
      const token = TokenUtil.extractTokenFromHeader(request);
      if (!token) {
        const message = await this.i18n.t('errors.AUTH_REQUIRED', {
          lang: I18nContext.current()?.lang || 'ko',
        });
        throw new UnauthorizedException(message);
      }

      // 2. JWT 토큰 검증 (블랙리스트 확인보다 먼저 - 잘못된 토큰은 Redis 조회 불필요)
      let payload: CurrentUserData;
      try {
        payload = await this.jwtService.verifyAsync<CurrentUserData>(token, {
          secret: this.jwtSecret,
        });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          const message = await this.i18n.t('errors.EXPIRED_TOKEN', {
            lang: I18nContext.current()?.lang || 'ko',
          });
          throw new UnauthorizedException(message);
        } else if (jwtError.name === 'JsonWebTokenError') {
          const message = await this.i18n.t('errors.INVALID_TOKEN', {
            lang: I18nContext.current()?.lang || 'ko',
          });
          throw new UnauthorizedException(message);
        }
        throw jwtError;
      }

      // 3. 병렬 처리: 블랙리스트 확인과 사용자 정보 조회를 동시에 실행
      const [isTokenBlacklisted, isUserBlacklisted, user] = await Promise.all([
        this.tokenBlacklistService.isTokenBlacklisted(token),
        this.tokenBlacklistService.isUserBlacklisted(payload.id),
        User.findOne({
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
        }),
      ]);

      // 4. 토큰 블랙리스트 확인
      if (isTokenBlacklisted) {
        // 프로덕션에서는 로깅 최소화
        if (process.env.NODE_ENV !== 'production') {
          const blacklistInfo =
            await this.tokenBlacklistService.getBlacklistInfo(token);
          this.logger.warn(
            `Blacklisted token used: reason=${blacklistInfo?.reason}, userId=${blacklistInfo?.userId}`,
          );
        }
        throw new UnauthorizedException(
          '무효화된 토큰입니다. 다시 로그인해주세요.',
        );
      }

      // 5. 사용자 세션 블랙리스트 확인
      if (isUserBlacklisted) {
        // 프로덕션에서는 로깅 최소화
        if (process.env.NODE_ENV !== 'production') {
          const userBlacklistInfo =
            await this.tokenBlacklistService.getUserBlacklistInfo(payload.id);
          this.logger.warn(
            `User blacklisted: userId=${payload.id}, reason=${userBlacklistInfo?.reason}`,
          );
        }
        throw new UnauthorizedException(
          '세션이 무효화되었습니다. 다시 로그인해주세요.',
        );
      }

      // 6. 사용자 존재 및 차단 상태 확인
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

      // 7. 요청 객체에 사용자 정보 추가 (최소한의 정보만)
      (request as any).user = payload;
      (request as any).userEntity = user; // AdminGuard가 재조회하지 않도록 저장
      (request as any).token = token;

      return true;
    } catch (_error) {
      if (_error instanceof UnauthorizedException) {
        throw _error;
      }

      this.logger.error(
        `Authentication error: ${_error.message}`,
        _error.stack,
      );
      throw new UnauthorizedException('인증 처리 중 오류가 발생했습니다.');
    }
  }
}
