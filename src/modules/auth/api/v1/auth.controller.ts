import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-client';
import { Repository } from 'typeorm';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../../../../common/constants/app.constants';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../../../guards/auth.guard';
import { UserDeletionService } from '../../../user/services/user-deletion.service';
import { SocialProvider, User } from '../../../user/user.entity';
import { AuthService, JwtPayload } from '../../auth.service';
import {
  DeleteAccountDto,
  DeleteAccountResultDto,
} from '../../dto/delete-account.dto';
import { SocialLoginDto } from '../../dto/social-login.dto';

/**
 * 소셜 로그인 사용자 정보 인터페이스
 */
interface SocialUserInfo {
  socialId: string;
  email: string;
  name: string;
  avatar?: string;
  provider: SocialProvider;
}

/**
 * Auth API Controller (v1)
 *
 * 인증 관련 API를 제공합니다.
 * 소셜 로그인, 토큰 관리, 회원가입/탈퇴를 포함합니다.
 *
 * 주요 기능:
 * - 소셜 로그인 (Google, Apple)
 * - JWT 토큰 발급 및 갱신
 * - 로그아웃 및 토큰 무효화
 * - 회원탈퇴 및 데이터 완전 삭제
 *
 * 권한 규칙:
 * - 로그인/회원가입: 인증 불필요
 * - 토큰 갱신: 인증 불필요 (refresh token으로 검증)
 * - 로그아웃/탈퇴: 인증 필요 (AuthGuard)
 */
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly googleClient: OAuth2Client;
  private readonly appleJwksClient: jwksClient.JwksClient;

  constructor(
    private readonly authService: AuthService,
    private readonly userDeletionService: UserDeletionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Google OAuth 클라이언트 초기화
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Apple JWKS 클라이언트 초기화
    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
    });
  }

  /**
   * 소셜 로그인 및 회원가입
   *
   * @param socialLoginDto 소셜 로그인 정보
   * @returns JWT 토큰 및 사용자 정보
   */
  @Post('sign/social')
  @HttpCode(HttpStatus.OK)
  async socialLogin(@Body() socialLoginDto: SocialLoginDto) {
    try {
      this.logger.log(`🔑 Social login request: ${socialLoginDto.provider}`);

      // 소셜 토큰 검증 및 사용자 정보 획득
      const socialUserInfo = await this.getSocialUserInfo(
        socialLoginDto.provider,
        socialLoginDto.socialToken,
      );

      // 기존 사용자 조회
      let user = await this.userRepository.findOne({
        where: {
          socialId: socialUserInfo.socialId,
          provider: socialUserInfo.provider,
        },
      });

      // 신규 사용자 생성
      if (!user) {
        user = this.userRepository.create({
          socialId: socialUserInfo.socialId,
          provider: socialUserInfo.provider,
          email: socialUserInfo.email,
          name: socialUserInfo.name,
          avatar: socialUserInfo.avatar,
          loginCount: 1,
          firstLoginAt: new Date(),
          lastSeenAt: new Date(),
        });

        user = await this.userRepository.save(user);
        this.logger.log(`✅ New user created: ${user.email} (${user.id})`);
      } else {
        // 기존 사용자 로그인 카운트 증가
        user.incrementLoginCount();
        user.setOnline();
        await this.userRepository.save(user);
        this.logger.log(`✅ Existing user login: ${user.email} (${user.id})`);
      }

      // 계정 상태 확인
      if (!user.isActive) {
        throw new BadRequestException('비활성화된 계정입니다.');
      }

      if (user.isBannedNow()) {
        throw new BadRequestException('차단된 계정입니다.');
      }

      // JWT 토큰 발급
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
      };

      const tokens = this.authService.generateTokenPair(payload);

      // Refresh Token 저장
      await this.userRepository.update(user.id, {
        refreshToken: tokens.refreshToken,
      });

      this.logger.log(`🎉 Social login successful: userId=${user.id}`);

      return {
        ...tokens,
        user,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Social login failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  /**
   * JWT 토큰 갱신
   *
   * @param req Request 객체 (Authorization 헤더에서 refresh token 추출)
   * @returns 새로운 액세스 토큰
   */
  @Post('sign/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request) {
    try {
      this.logger.log('🔄 Token refresh request');

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
      const user = await this.userRepository.findOne({
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

      this.logger.log(`✅ Access token refreshed for user: ${user.email}`);
      return { accessToken: newAccessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  /**
   * 로그아웃
   * 현재 사용자의 토큰을 무효화하고 오프라인 상태로 전환합니다.
   *
   * @param req Request 객체 (Authorization 헤더에서 token 추출)
   * @returns 성공 메시지
   */
  @Post('sign/out')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    try {
      const authHeader = req.headers['authorization'];

      if (!authHeader) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH_HEADER_REQUIRED);
      }

      const token = this.authService.extractBearerToken(authHeader as string);

      const decoded = this.authService.verifyToken(token);

      // 리프레시 토큰 제거 및 오프라인 상태 설정
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (user) {
        user.setOffline();
        await this.userRepository.update(decoded.id, {
          refreshToken: undefined,
        });
      }

      this.logger.log(`👋 User signed out: ${decoded.email}`);
      return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Sign out failed', error);
      throw new BadRequestException(ERROR_MESSAGES.LOGOUT_ERROR);
    }
  }

  /**
   * 계정 삭제 영향도 분석
   * 회원탈퇴 전 삭제될 데이터의 양과 영향을 미리 확인할 수 있습니다.
   *
   * @param currentUser 현재 로그인된 사용자
   * @returns 삭제 영향도 분석 결과
   */
  @Get('account/deletion-impact')
  @UseGuards(AuthGuard)
  async getAccountDeletionImpact(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    this.logger.log(`📊 Deletion impact analysis: userId=${user.id}`);

    const impact = await this.userDeletionService.analyzeDeletionImpact(
      user.id,
    );

    this.logger.log(
      `📋 Impact analysis completed: ${impact.totalImpactedRecords} records will be affected`,
    );

    return {
      user: {
        ...user,
        status: 'DELETION_ANALYSIS',
      },
      meta: {
        deletionImpact: impact,
      },
    };
  }

  /**
   * 회원탈퇴 (계정 완전 삭제)
   * 한국 개인정보보호법에 따라 개인정보를 즉시 완전 삭제하고
   * 서비스 데이터는 익명화 처리합니다.
   *
   * @param currentUser 현재 로그인된 사용자
   * @param deleteAccountDto 탈퇴 확인 정보
   * @returns 삭제 결과
   */
  @Delete('account')
  @UseGuards(AuthGuard)
  async deleteAccount(
    @CurrentUser() currentUser: CurrentUserData,
    @Body() deleteAccountDto?: DeleteAccountDto,
  ): Promise<DeleteAccountResultDto> {
    const user: User = currentUser as User;

    this.logger.log(
      `🔥 Account deletion request: userId=${user.id} (${user.name})`,
    );

    try {
      // 확인 텍스트 검증 (필요시)
      if (
        deleteAccountDto?.confirmationText &&
        deleteAccountDto.confirmationText !== 'DELETE'
      ) {
        throw new UnauthorizedException('확인 텍스트가 일치하지 않습니다.');
      }

      // 삭제 전 영향도 분석
      const impact = await this.userDeletionService.analyzeDeletionImpact(
        user.id,
      );

      // 완전 삭제 실행
      const result = await this.userDeletionService.deleteUserCompletely(
        user.id,
      );

      if (!result.success) {
        throw new Error('계정 삭제 중 오류가 발생했습니다.');
      }

      this.logger.log(
        `✅ Account deleted successfully: userId=${user.id}, totalRecords=${impact.totalImpactedRecords}`,
      );

      return {
        success: true,
        message: '계정이 완전히 삭제되었습니다.',
        deletedData: {
          personalData: {
            user: result.deletedPersonalData.user,
            profile: result.deletedPersonalData.profile,
            notifications: result.deletedPersonalData.notifications,
            readReceipts: result.deletedPersonalData.readReceipts,
          },
          anonymizedData: {
            messages: result.anonymizedServiceData.messages,
            travelUsers: result.anonymizedServiceData.travelUsers,
            planetUsers: result.anonymizedServiceData.planetUsers,
            fileUploads: result.anonymizedServiceData.fileUploads,
            videoProcessings: result.anonymizedServiceData.videoProcessings,
            streamingSessions: result.anonymizedServiceData.streamingSessions,
          },
          totalImpactedRecords: impact.totalImpactedRecords,
        },
      };
    } catch (error) {
      this.logger.error(
        `❌ Account deletion failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 현재 사용자 정보 조회 (인증된 사용자용)
   * JWT 토큰이 유효한지 확인하고 사용자 정보를 반환합니다.
   *
   * @param currentUser 현재 로그인된 사용자
   * @returns 사용자 정보
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    this.logger.log(`👤 Current user info request: userId=${user.id}`);

    return {
      ...user,
      // 민감한 정보는 제외 (refreshToken 등은 @Exclude로 이미 처리됨)
    };
  }

  /**
   * 토큰 유효성 검증
   * 클라이언트가 토큰이 아직 유효한지 확인할 수 있는 엔드포인트입니다.
   *
   * @param currentUser 현재 로그인된 사용자
   * @returns 토큰 유효성 상태
   */
  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async verifyToken(@CurrentUser() currentUser: CurrentUserData): Promise<{
    valid: boolean;
    user: User;
    expiresIn?: number;
  }> {
    const user: User = currentUser as User;

    this.logger.log(`🔍 Token verification: userId=${user.id}`);

    return {
      valid: true,
      user,
      // TODO: JWT 토큰에서 남은 만료 시간 계산 후 추가
    };
  }

  // =================================================================
  // Private Methods - 소셜 로그인 토큰 검증
  // =================================================================

  /**
   * 소셜 토큰으로 사용자 정보 가져오기
   */
  private async getSocialUserInfo(
    provider: SocialProvider,
    socialToken: string,
  ): Promise<SocialUserInfo> {
    switch (provider) {
      case SocialProvider.GOOGLE:
        return this.getGoogleUserInfo(socialToken);
      case SocialProvider.APPLE:
        return this.getAppleUserInfo(socialToken);
      default:
        throw new UnauthorizedException(
          `지원하지 않는 소셜 로그인 제공자: ${provider}`,
        );
    }
  }

  /**
   * Google OAuth 2.0 ID 토큰 검증 및 사용자 정보 추출
   */
  private async getGoogleUserInfo(idToken: string): Promise<SocialUserInfo> {
    try {
      this.logger.log('🔍 Verifying Google ID token');

      // Google ID 토큰 검증
      const ticket = await this.googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('유효하지 않은 Google ID 토큰입니다.');
      }

      // 필수 필드 검증
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Google 토큰에 필수 정보가 없습니다.');
      }

      this.logger.log(`✅ Google user verified: ${payload.email}`);

      return {
        socialId: payload.sub, // Google User ID (고유 식별자)
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
        provider: SocialProvider.GOOGLE,
      };
    } catch (error) {
      this.logger.error(
        `❌ Google token verification failed: ${error.message}`,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Google 토큰 검증에 실패했습니다.');
    }
  }

  /**
   * Apple Identity Token (JWT) 검증 및 사용자 정보 추출
   */
  private async getAppleUserInfo(
    identityToken: string,
  ): Promise<SocialUserInfo> {
    try {
      this.logger.log('🔍 Verifying Apple Identity token');

      // JWT 헤더에서 키 ID 추출
      const decodedToken = jwt.decode(identityToken, { complete: true });
      if (!decodedToken || typeof decodedToken === 'string') {
        throw new UnauthorizedException(
          '유효하지 않은 Apple Identity 토큰입니다.',
        );
      }

      const { kid } = decodedToken.header;
      if (!kid) {
        throw new UnauthorizedException('Apple 토큰에 키 ID가 없습니다.');
      }

      // Apple 공개키 가져오기
      const key = await this.getAppleSigningKey(kid);

      // JWT 검증
      const payload = jwt.verify(identityToken, key, {
        algorithms: ['RS256'],
        audience: process.env.APPLE_CLIENT_ID, // Apple Client ID
        issuer: 'https://appleid.apple.com',
      }) as any;

      // 필수 필드 검증
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Apple 토큰에 필수 정보가 없습니다.');
      }

      this.logger.log(`✅ Apple user verified: ${payload.email}`);

      return {
        socialId: payload.sub, // Apple User ID (고유 식별자)
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: undefined, // Apple은 프로필 이미지를 제공하지 않음
        provider: SocialProvider.APPLE,
      };
    } catch (error) {
      this.logger.error(`❌ Apple token verification failed: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Apple 토큰 검증에 실패했습니다.');
    }
  }

  /**
   * Apple JWKS에서 공개키 가져오기
   */
  private async getAppleSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.appleJwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(
            new UnauthorizedException('Apple 공개키를 가져올 수 없습니다.'),
          );
          return;
        }

        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          reject(
            new UnauthorizedException('Apple 공개키가 유효하지 않습니다.'),
          );
          return;
        }

        resolve(signingKey);
      });
    });
  }
}
