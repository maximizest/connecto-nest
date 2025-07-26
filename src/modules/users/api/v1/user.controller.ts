import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Crud, crudResponse } from '@foryourdev/nestjs-crud';
import { User } from '../../user.entity';
import { UserService } from '../../user.service';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';

@Crud({
  entity: User,
  logging: true,
  allowedFilters: ['email'],
  only: ['index', 'show'],
})
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(public readonly crudService: UserService) { }

  @Get('me')
  @UseGuards(AuthGuard)
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
