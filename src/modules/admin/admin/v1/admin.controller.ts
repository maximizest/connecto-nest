import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import { Controller, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SECURITY_CONSTANTS } from '../../../../common/constants/app.constants';
import { AdminGuard } from '../../../../guards/admin.guard';
import { Admin } from '../../admin.entity';
import { AdminService } from '../../admin.service';

@Crud({
  entity: Admin,
  allowedFilters: ['name', 'email', 'createdAt', 'updatedAt'],
  allowedParams: ['name', 'email', 'password'],
  allowedIncludes: [],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
@Controller({
  path: 'admin/admins',
  version: '1',
})
@UseGuards(AdminGuard)
export class AdminController {
  constructor(public readonly crudService: AdminService) {}

  @BeforeCreate()
  @BeforeUpdate()
  async hashPassword(body: any) {
    if (body.password) {
      body.password = await bcrypt.hash(
        body.password,
        SECURITY_CONSTANTS.BCRYPT_SALT_ROUNDS,
      );
    }

    return body;
  }
}
