import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './api/v1/user.controller';
import { AdminUserController } from './admin/v1/user.controller';
import { AuthGuard } from '../../guards/auth.guard';
import { AdminGuard } from '../../guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, AdminUserController],
  providers: [UserService, AuthGuard, AdminGuard],
  exports: [UserService],
})
export class UserModule { }
