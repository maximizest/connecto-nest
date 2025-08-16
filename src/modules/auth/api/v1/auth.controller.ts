import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/common/constants/app.constants';
import { Profile } from '../../../profile/profile.entity';
import { User } from '../../../user/user.entity';
import { PushNotificationService } from '../../../notification/services/push-notification.service';
import { AuthService } from '../../auth.service';
import { JwtPayload } from '../../types/jwt-payload.interface';
import { SocialSigninDto } from '../../dto/social-signin.dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly pushNotificationService: PushNotificationService,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  @Post('sign/social')
  async signSocial(@Body() data: SocialSigninDto) {
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
        select: ['id', 'email', 'name', 'isBanned'],
      });

      // 계정 상태 확인
      if (user && user.isBanned) {
        throw new BadRequestException('정지된 계정입니다.');
      }

      // 새 사용자인 경우 계정 생성
      if (!user) {
        user = User.create({
          socialId: socialUserInfo.socialId,
          provider: data.provider,
          email: socialUserInfo.email,
          name: socialUserInfo.name,
          notificationsEnabled: true,
        });

        user = await user.save();

        // 프로필 자동 생성
        await this.createDefaultProfile(user.id);
      } else {
        // 기존 사용자인 경우 프로필 정보 업데이트
        user.name = socialUserInfo.name;

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

      // 푸시 토큰 등록 (선택적)
      if (data.pushToken && data.platform && data.deviceId) {
        try {
          await this.pushNotificationService.registerPushToken(
            user.id,
            data.pushToken,
            data.platform,
            data.deviceId,
            data.appVersion,
          );
        } catch (error) {
          // 푸시 토큰 등록 실패해도 로그인은 성공
          this.logger.error('푸시 토큰 등록 실패:', error);
        }
      }

      return {
        ...tokens,
        isNewUser: !user,
        pushTokenRegistered: !!(
          data.pushToken &&
          data.platform &&
          data.deviceId
        ),
      };
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

      const refreshToken = this.authService.extractBearerToken(authHeader);

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

      const token = this.authService.extractBearerToken(authHeader);

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

  /**
   * 기본 프로필 자동 생성
   */
  private async createDefaultProfile(userId: number): Promise<void> {
    try {
      const profile = new Profile();
      profile.userId = userId;
      profile.nickname = '';
      profile.name = '';
      profile.occupation = '';

      await this.profileRepository.save(profile);
    } catch (error) {
      // 프로필 생성 실패해도 로그인은 성공
      this.logger.error('프로필 자동 생성 실패:', error);
    }
  }
}
