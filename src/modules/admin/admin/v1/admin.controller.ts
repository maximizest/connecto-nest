import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { AdminGuard } from 'src/guards/admin.guard';
import { Admin } from '../../admin.entity';
import { AdminService } from '../../admin.service';

@Crud({
  entity: Admin,
  allowedFilters: ['email', 'name'],
  allowedParams: ['name', 'email', 'password'],
  allowedIncludes: [],
  only: ['index', 'show', 'create', 'update', 'destroy'],
  routes: {
    index: {
      allowedFilters: ['email', 'name'],
      allowedIncludes: [],
    },
    show: {
      allowedIncludes: [],
    },
  },
})
@Controller({
  path: 'admin/users',
  version: '1',
})
export class AdminController {
  constructor(public readonly crudService: AdminService) {}

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
    const user = await Admin.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
