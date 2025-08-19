import { Module } from '@nestjs/common';
import { UserController } from './api/v1/user.controller';
import { UserService } from './user.service';

/**
 * User 모듈 - Active Record Pattern
 * 
 * Repository 주입 없이 User 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
