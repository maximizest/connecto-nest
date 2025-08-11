import { Crud } from '@foryourdev/nestjs-crud';
import { Controller, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../../guards/admin.guard';
import { Admin } from '../../admin.entity';
import { AdminService } from '../../admin.service';

/**
 * Admin API Controller (v1)
 *
 * 관리자 계정 관리 API를 제공합니다.
 * 패스워드 해싱은 Admin 엔티티의 TypeORM lifecycle hooks에서 자동 처리됩니다.
 */
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

  // 패스워드 해싱은 Admin 엔티티의 @BeforeInsert, @BeforeUpdate에서 자동 처리됨
}
