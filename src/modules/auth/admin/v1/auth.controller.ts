import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Not, IsNull } from 'typeorm';
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

  @Get('stats')
  @UseGuards(AuthGuard)
  async getAuthStats(@CurrentUser() currentUser: CurrentUserData) {
    // 인증 관련 통계
    const totalUsers = await User.count();
    const socialUsers = await User.count({
      where: { provider: SocialProvider.GOOGLE }
    });
    const localUsers = await User.count({
      where: { provider: SocialProvider.LOCAL }
    });
    const activeUsers = await User.count({
      where: { refreshToken: Not(IsNull()) } // refreshToken이 null이 아닌 = 로그인 상태
    });

    return {
      total: totalUsers,
      social: socialUsers,
      local: localUsers,
      active: activeUsers,
      providers: {
        google: await User.count({ where: { provider: SocialProvider.GOOGLE } }),
        kakao: await User.count({ where: { provider: SocialProvider.KAKAO } }),
        naver: await User.count({ where: { provider: SocialProvider.NAVER } }),
        apple: await User.count({ where: { provider: SocialProvider.APPLE } }),
      }
    };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async getActiveSessions(@CurrentUser() currentUser: CurrentUserData) {
    // 활성 세션 조회 (refreshToken이 있는 사용자들)
    const activeSessions = await User.find({
      where: { refreshToken: Not(IsNull()) },
      select: ['id', 'email', 'name', 'provider', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });

    return {
      count: activeSessions.length,
      sessions: activeSessions,
    };
  }

  @Post('users')
  @UseGuards(AuthGuard)
  async createUser(
    @Body() data: AuthSignupDto,
    @CurrentUser() currentUser: CurrentUserData
  ) {
    try {
      // 관리자만 사용자 생성 가능 (추후 role 체크 로직 추가)
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

  @Delete('users/:id')
  @UseGuards(AuthGuard)
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: CurrentUserData
  ) {
    try {
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // 자기 자신은 삭제할 수 없음
      if (user.id === currentUser.id) {
        throw new BadRequestException('자기 자신은 삭제할 수 없습니다.');
      }

      await User.delete(userId);
      this.logger.log(`Admin ${currentUser.email} deleted user: ${user.email}`);

      return { message: '사용자가 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin user deletion failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('logout/:id')
  @UseGuards(AuthGuard)
  async forceLogout(
    @Param('id', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: CurrentUserData
  ) {
    try {
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // 강제 로그아웃 (refreshToken 제거)
      await User.update(userId, { refreshToken: null });
      this.logger.log(`Admin ${currentUser.email} forced logout user: ${user.email}`);

      return { message: '사용자가 강제 로그아웃되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin force logout failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Get('users/search')
  @UseGuards(AuthGuard)
  async searchUsers(
    @CurrentUser() currentUser: CurrentUserData,
    @Query('email') email?: string,
    @Query('provider') provider?: SocialProvider,
    @Query('limit') limit: number = 20
  ) {
    try {
      const whereCondition: any = {};

      if (email) {
        whereCondition.email = email;
      }

      if (provider) {
        whereCondition.provider = provider;
      }

      const users = await User.find({
        where: whereCondition,
        select: ['id', 'email', 'name', 'provider', 'role', 'createdAt'],
        take: Math.min(limit, 100), // 최대 100개로 제한
        order: { createdAt: 'DESC' },
      });

      return {
        count: users.length,
        users,
      };
    } catch (error) {
      this.logger.error('Admin user search failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  @Post('users/:id/role')
  @UseGuards(AuthGuard)
  async changeUserRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body('role') role: UserRole,
    @CurrentUser() currentUser: CurrentUserData
  ) {
    try {
      const user = await User.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // 자기 자신의 역할은 변경할 수 없음
      if (user.id === currentUser.id) {
        throw new BadRequestException('자기 자신의 역할은 변경할 수 없습니다.');
      }

      await User.update(userId, { role });
      this.logger.log(`Admin ${currentUser.email} changed role of ${user.email} to ${role}`);

      return { message: '사용자 역할이 변경되었습니다.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Admin role change failed', error);
      throw new BadRequestException(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
} 