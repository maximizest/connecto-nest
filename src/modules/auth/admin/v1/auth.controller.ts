import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/common/constants/app.constants';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { AdminGuard } from 'src/guards/admin.guard';
import { Admin } from 'src/modules/admin/admin.entity';
import { AuthService, JwtPayload } from '../../auth.service';

@Controller({
  path: 'admin/auth',
  version: '1',
})
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('sign/in')
  async signIn(@Body() data: { email: string; password: string }) {
    try {
      const admin = await Admin.findOne({
        where: { email: data.email },
        select: ['id', 'email', 'password'],
      });

      if (!admin) {
        throw new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_FOUND);
      }

      if (!admin.password) {
        throw new BadRequestException('비밀번호가 설정되지 않았습니다.');
      }

      const isMatch = await bcrypt.compare(data.password, admin.password);

      if (!isMatch) {
        throw new BadRequestException(ERROR_MESSAGES.PASSWORD_MISMATCH);
      }

      const payload: JwtPayload = {
        id: admin.id,
        email: admin.email,
      };

      const tokens = this.authService.generateTokenPair(payload);

      // 리프레시 토큰 저장
      await Admin.update(admin.id, { refreshToken: tokens.refreshToken });

      this.logger.log(`Admin signed in: ${admin.email}`);
      return tokens;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin sign in failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('sign/refresh')
  async refreshToken(@Body() data: { refreshToken: string }) {
    try {
      // 리프레시 토큰 검증
      const decoded = this.authService.verifyToken(data.refreshToken);

      // 데이터베이스에서 관리자 및 리프레시 토큰 확인
      const admin = await Admin.findOne({
        where: {
          id: decoded.id,
          refreshToken: data.refreshToken,
        },
        select: ['id', 'email', 'refreshToken'],
      });

      if (!admin || admin.refreshToken !== data.refreshToken) {
        throw new BadRequestException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // 새로운 액세스 토큰 생성
      const payload: JwtPayload = {
        id: admin.id,
        email: admin.email,
      };

      const newAccessToken = this.authService.generateAccessToken(payload);

      this.logger.log(`Admin access token refreshed: ${admin.email}`);
      return { accessToken: newAccessToken };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin token refresh failed', error);
      throw new BadRequestException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  @Post('sign/out')
  @UseGuards(AdminGuard)
  async signOut(@CurrentUser() currentUser: CurrentUserData) {
    try {
      // 리프레시 토큰 제거
      await Admin.update(currentUser.id, { refreshToken: null });

      this.logger.log(`Admin signed out: ${currentUser.email}`);
      return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      this.logger.error('Admin sign out failed', error);
      throw new BadRequestException(ERROR_MESSAGES.LOGOUT_ERROR);
    }
  }
}
