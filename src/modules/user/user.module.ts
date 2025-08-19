import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './api/v1/user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';

/**
 * User 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 User 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
