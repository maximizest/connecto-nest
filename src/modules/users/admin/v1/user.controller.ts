import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BeforeCreate, BeforeUpdate, Crud, SaveBefore } from '@foryourdev/nestjs-crud';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { CurrentUser, CurrentUserData } from 'src/common/decorators/current-user.decorator';
import * as bcrypt from 'bcrypt';

@Crud({
  entity: User,
  allowedFilters: ['email', 'role', 'createdAt'],
  allowedParams: ['name', 'email', 'password', 'phone', 'role', 'provider', 'providerId'],
  allowedIncludes: ['posts'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
@Controller({
  path: 'admin/users',
  version: '1',
})
export class AdminUserController {
  constructor(public readonly crudService: UserService) { }

  @BeforeCreate()
  @BeforeUpdate()
  async hashPassword(body: any) {
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }

    return body;
  }

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