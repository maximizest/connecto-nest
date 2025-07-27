import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Crud } from '@foryourdev/nestjs-crud';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { CurrentUser, CurrentUserData } from 'src/common/decorators/current-user.decorator';

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

  @Get('me')
  @UseGuards(AdminGuard)
  async me(@CurrentUser() currentUser: CurrentUserData) {
    const user = await User.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
} 