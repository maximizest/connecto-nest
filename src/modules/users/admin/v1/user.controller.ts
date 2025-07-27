import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Crud, crudResponse } from '@foryourdev/nestjs-crud';
import { User, UserRole } from '../../user.entity';
import { UserService } from '../../user.service';
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
} 