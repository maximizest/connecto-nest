import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { User, UserRole, SocialProvider } from 'src/modules/users/user.entity';
import { AuthSignupDto } from '../../dto/auth.signup.dto';
import * as bcrypt from 'bcrypt';
import { AuthSigninDto } from '../../dto/auth.signin.dto';
import { Request, Response } from 'express';
import { AuthService } from '../../auth.service';
import { CurrentUserData } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign/up')
  async signUp(@Body() data: AuthSignupDto) {
    const isExist = await User.exists({ where: { email: data.email } });

    if (isExist) {
      throw new BadRequestException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = User.create({
      ...data,
      password: hashedPassword,
      role: data.role || UserRole.USER,
      provider: SocialProvider.LOCAL,
    });

    return await user.save();
  }

  @Post('sign/in')
  async signIn(@Body() data: AuthSigninDto) {
    const user = await User.findOne({
      where: { email: data.email, provider: SocialProvider.LOCAL },
      select: ['id', 'email', 'password', 'name', 'role'],
    });

    if (!user) {
      throw new BadRequestException('존재하지 않는 이메일입니다.');
    }

    const isMatch = await bcrypt.compare(data.password, user.password!);

    if (!isMatch) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    const payload = {
      id: user.id,
      email: user.email,
    };

    const tokens = this.authService.generateTokenPair(payload);

    await User.update(user.id, { refreshToken: tokens.refreshToken });

    return tokens;
  }

  @Post('sign/refresh')
  async refreshToken(@Req() req: Request) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('인증 헤더가 없습니다.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = this.authService.verifyToken(token) as CurrentUserData;

      const user = await User.findOne({
        where: { id: decoded.id, refreshToken: token },
        select: ['id', 'email', 'refreshToken'],
      });

      if (!user) {
        throw new BadRequestException('유효하지 않은 refresh token입니다.');
      }

      const payload = {
        id: user.id,
        email: user.email,
      };

      const accessToken = this.authService.generateAccessToken(payload);

      return { accessToken };
    } catch {
      throw new BadRequestException('유효하지 않은 토큰입니다.');
    }
  }

  @Post('sign/out')
  async signOut(@Req() req: Request) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('인증 헤더가 없습니다.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = this.authService.verifyToken(token) as CurrentUserData;

      await User.update(decoded.id, { refreshToken: null });

      return { message: '로그아웃되었습니다.' };
    } catch {
      throw new BadRequestException('유효하지 않은 토큰입니다.');
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
