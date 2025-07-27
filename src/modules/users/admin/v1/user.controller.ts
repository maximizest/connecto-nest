import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Crud, crudResponse } from '@foryourdev/nestjs-crud';
import { User, UserRole } from '../../user.entity';
import { UserService } from '../../user.service';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';

@Crud({
  entity: User,
  allowedFilters: ['email', 'role', 'createdAt'],
  allowedParams: ['phone', 'id'],
  allowedIncludes: ['posts'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
@Controller({
  path: 'admin/users',
  version: '1',
})
export class AdminUserController {
  constructor(public readonly crudService: UserService) { }

  @Get('stats')
  @UseGuards(AuthGuard)
  async getUserStats(@CurrentUser() currentUser: CurrentUserData) {
    // 관리자 전용 사용자 통계
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { role: UserRole.USER } });
    const adminUsers = await User.count({ where: { role: UserRole.ADMIN } });

    return {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      growth: {
        // 지난 30일간 가입자 수 등 추가 통계 가능
      }
    };
  }

  @Get('recent')
  @UseGuards(AuthGuard)
  async getRecentUsers(@CurrentUser() currentUser: CurrentUserData) {
    // 최근 가입한 사용자 목록 (관리자용)
    return await User.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }
} 