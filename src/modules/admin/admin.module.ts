import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from 'src/guards/admin.guard';
import { AuthGuard } from 'src/guards/auth.guard';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin/v1/admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminController],
  providers: [AdminService, AuthGuard, AdminGuard],
  exports: [AdminService],
})
export class UserModule {}
