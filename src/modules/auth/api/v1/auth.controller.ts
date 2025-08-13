import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/common/constants/app.constants';
import { User } from '../../../user/user.entity';
import { AuthService, JwtPayload } from '../../auth.service';
import { SocialSigninDto } from '../../dto/social-signin.dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign/in')
  async socialSignIn(@Body() data: SocialSigninDto) {
    try {
      // 소셜 로그인 토큰 검증
      const socialUserInfo = await this.authService.verifySocialToken(
        data.provider,
        data.token,
      );

      // 기존 사용자 조회
      let user = await User.findOne({
        where: {
          socialId: socialUserInfo.socialId,
          provider: data.provider,
        },
        select: ['id', 'email', 'name', 'avatar', 'isActive', 'isBanned'],
      });

      // 계정 상태 확인
      if (user && user.isBanned) {
        throw new BadRequestException('정지된 계정입니다.');
      }

      if (user && !user.isActive) {
        throw new BadRequestException('비활성화된 계정입니다.');
      }

      // 새 사용자인 경우 계정 생성
      if (!user) {
        user = User.create({
          socialId: socialUserInfo.socialId,
          provider: data.provider,
          email: socialUserInfo.email,
          name: socialUserInfo.name,
          avatar: socialUserInfo.avatar,
          isActive: true,
          notificationsEnabled: true,
        });

        user = await user.save();
      } else {
        // 기존 사용자인 경우 프로필 정보 업데이트
        user.name = socialUserInfo.name;
        user.avatar = socialUserInfo.avatar;
        user.incrementLoginCount();
        user.setOnline();

        user = await user.save();
      }

      // JWT 토큰 생성
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const tokens = this.authService.generateTokenPair(payload);

      // 리프레시 토큰 저장
      await User.update(user.id, { refreshToken: tokens.refreshToken });

      return tokens;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new BadRequestException('소셜 로그인 처리 중 오류가 발생했습니다.');
    }
  }

  @Post('sign/refresh')
  async refreshToken(@Req() req: Request) {
    try {
      const authHeader = req.headers['authorization'];

      if (!authHeader) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH_HEADER_REQUIRED);
      }

      const refreshToken = this.authService.extractBearerToken(
        authHeader as string,
      );

      // 리프레시 토큰 검증
      const decoded = this.authService.verifyToken(refreshToken);

      // 데이터베이스에서 사용자 및 리프레시 토큰 확인
      const user = await User.findOne({
        where: {
          id: decoded.id,
          refreshToken: refreshToken,
        },
        select: ['id', 'email', 'refreshToken'],
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // 새로운 액세스 토큰 생성
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const newAccessToken = this.authService.generateAccessToken(payload);

      return { accessToken: newAccessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  @Post('sign/out')
  async signOut(@Req() req: Request) {
    try {
      const authHeader = req.headers['authorization'];

      if (!authHeader) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH_HEADER_REQUIRED);
      }

      const token = this.authService.extractBearerToken(authHeader as string);

      const decoded = this.authService.verifyToken(token);

      // 리프레시 토큰 제거
      await User.update(decoded.id, { refreshToken: undefined });

      return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException(ERROR_MESSAGES.LOGOUT_ERROR);
    }
  }
}
