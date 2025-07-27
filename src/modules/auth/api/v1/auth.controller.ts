import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole, SocialProvider } from 'src/modules/users/user.entity';
import { AuthSignupDto } from '../../dto/auth.signup.dto';
import * as bcrypt from 'bcrypt';
import { AuthSigninDto } from '../../dto/auth.signin.dto';
import { Request, Response } from 'express';
import { AuthService, JwtPayload } from '../../auth.service';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  SECURITY_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from 'src/common/constants/app.constants';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

  @Post('sign/up')
  async signUp(@Body() data: AuthSignupDto) {
    try {
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
      this.logger.log(`User registered: ${savedUser.email}`);

      return savedUser;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Sign up failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('sign/in')
  async signIn(@Body() data: AuthSigninDto) {
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

      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const tokens = this.authService.generateTokenPair(payload);

      // 리프레시 토큰 저장
      await User.update(user.id, { refreshToken: tokens.refreshToken });

      this.logger.log(`User signed in: ${user.email}`);
      return tokens;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Sign in failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('sign/refresh')
  async refreshToken(@Req() req: Request) {
    try {
      const authHeader = req.headers['authorization'];

      if (!authHeader) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH_HEADER_REQUIRED);
      }

      const refreshToken = this.authService.extractBearerToken(authHeader as string);

      // 리프레시 토큰 검증
      const decoded = this.authService.verifyToken(refreshToken);

      // 데이터베이스에서 사용자 및 리프레시 토큰 확인
      const user = await User.findOne({
        where: {
          id: decoded.id,
          refreshToken: refreshToken
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

      this.logger.log(`Access token refreshed for user: ${user.email}`);
      return { accessToken: newAccessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Token refresh failed', error);
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
      await User.update(decoded.id, { refreshToken: null });

      this.logger.log(`User signed out: ${decoded.email}`);
      return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Sign out failed', error);
      throw new BadRequestException(ERROR_MESSAGES.LOGOUT_ERROR);
    }
  }

  // Google 소셜 로그인
  @Get('google')
  async googleAuth(@Res() res: Response) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestException('Google 소셜 로그인이 설정되지 않았습니다.');
    }

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback')}&response_type=code&scope=email%20profile`;

    return res.redirect(googleAuthUrl);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const payload = { id: user.id, email: user.email };
    const tokens = this.authService.generateTokenPair(payload);

    await User.update(user.id, { refreshToken: tokens.refreshToken });

    // 프론트엔드로 토큰과 함께 리다이렉트
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }

  // Kakao 소셜 로그인
  @Get('kakao')
  async kakaoAuth(@Res() res: Response) {
    if (!process.env.KAKAO_CLIENT_ID) {
      throw new BadRequestException('Kakao 소셜 로그인이 설정되지 않았습니다.');
    }

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.KAKAO_CALLBACK_URL || 'http://localhost:3000/auth/kakao/callback')}&response_type=code`;

    return res.redirect(kakaoAuthUrl);
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const payload = { id: user.id, email: user.email };
    const tokens = this.authService.generateTokenPair(payload);

    await User.update(user.id, { refreshToken: tokens.refreshToken });

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }

  // Naver 소셜 로그인
  @Get('naver')
  async naverAuth(@Res() res: Response) {
    if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
      throw new BadRequestException('Naver 소셜 로그인이 설정되지 않았습니다.');
    }

    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NAVER_CALLBACK_URL || 'http://localhost:3000/auth/naver/callback')}&state=STATE_STRING`;

    return res.redirect(naverAuthUrl);
  }

  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  async naverAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const payload = { id: user.id, email: user.email };
    const tokens = this.authService.generateTokenPair(payload);

    await User.update(user.id, { refreshToken: tokens.refreshToken });

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }

  // Apple 소셜 로그인
  @Get('apple')
  async appleAuth(@Res() res: Response) {
    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
      throw new BadRequestException('Apple 소셜 로그인이 설정되지 않았습니다.');
    }

    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${process.env.APPLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.APPLE_CALLBACK_URL || 'http://localhost:3000/auth/apple/callback')}&response_type=code&scope=name%20email&response_mode=form_post`;

    return res.redirect(appleAuthUrl);
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const payload = { id: user.id, email: user.email };
    const tokens = this.authService.generateTokenPair(payload);

    await User.update(user.id, { refreshToken: tokens.refreshToken });

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }
}
