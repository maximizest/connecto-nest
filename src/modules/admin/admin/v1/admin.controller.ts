import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import { Controller } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Admin } from '../../admin.entity';
import { AdminService } from '../../admin.service';

@Crud({
  entity: Admin,
  allowedFilters: [],
  allowedParams: ['name', 'email', 'password'],
  allowedIncludes: [],
  only: ['index', 'show', 'create', 'update', 'destroy'],
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
}
