import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { User, UserRole, SocialProvider } from 'src/modules/users/user.entity';
import { AuthService, JwtPayload } from '../../auth.service';
import { AuthSignupDto } from '../../dto/auth.signup.dto';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import * as bcrypt from 'bcrypt';
import {
  SECURITY_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from 'src/common/constants/app.constants';

@Controller({
  path: 'admin/auth',
  version: '1',
})
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('sign/up')
  @UseGuards(AuthGuard)
  async signUp(
    @Body() data: AuthSignupDto,
    @CurrentUser() currentUser: CurrentUserData
  ) {
    try {
      // 관리자만 사용자 생성 가능
      const isExist = await User.exists({ where: { email: data.email } });

      if (isExist) {
        throw new BadRequestException(ERROR_MESSAGES.EMAIL_EXISTS);
      }

      const hashedPassword = await bcrypt.hash(data.password, SECURITY_CONSTANTS.BCRYPT_SALT_ROUNDS);

      const user = User.create({
        ...data,
        password: hashedPassword,
        role: data.role || UserRole.USER,
        provider: SocialProvider.LOCAL,
      });

      const savedUser = await user.save();
      this.logger.log(`Admin ${currentUser.email} created user: ${savedUser.email}`);

      return savedUser;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin user creation failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('sign/in')
  async signIn(@Body() data: { email: string; password: string }) {
    try {
      const user = await User.findOne({
        where: { email: data.email, provider: SocialProvider.LOCAL },
        select: ['id', 'email', 'password', 'name', 'role'],
      });

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGES.EMAIL_NOT_FOUND);
      }

      if (!user.password) {
        throw new BadRequestException(ERROR_MESSAGES.SOCIAL_LOGIN_ACCOUNT);
      }

      const isMatch = await bcrypt.compare(data.password, user.password);

      if (!isMatch) {
        throw new BadRequestException(ERROR_MESSAGES.PASSWORD_MISMATCH);
      }

      // 관리자 권한 체크
      if (user.role !== UserRole.ADMIN) {
        throw new BadRequestException('관리자 권한이 필요합니다.');
      }

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const tokens = this.authService.generateTokenPair(payload);

      // 리프레시 토큰 저장
      await User.update(user.id, { refreshToken: tokens.refreshToken });

      this.logger.log(`Admin signed in: ${user.email}`);
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

      // 데이터베이스에서 사용자 및 리프레시 토큰 확인
      const user = await User.findOne({
        where: {
          id: decoded.id,
          refreshToken: data.refreshToken
        },
        select: ['id', 'email', 'refreshToken', 'role'],
      });

      if (!user || user.refreshToken !== data.refreshToken) {
        throw new BadRequestException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // 관리자 권한 체크
      if (user.role !== UserRole.ADMIN) {
        throw new BadRequestException('관리자 권한이 필요합니다.');
      }

      // 새로운 액세스 토큰 생성
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const newAccessToken = this.authService.generateAccessToken(payload);

      this.logger.log(`Admin access token refreshed: ${user.email}`);
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
  @UseGuards(AuthGuard)
  async signOut(@CurrentUser() currentUser: CurrentUserData) {
    try {
      // 리프레시 토큰 제거
      await User.update(currentUser.id, { refreshToken: null });

      this.logger.log(`Admin signed out: ${currentUser.email}`);
      return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      this.logger.error('Admin sign out failed', error);
      throw new BadRequestException(ERROR_MESSAGES.LOGOUT_ERROR);
    }
  }
} 