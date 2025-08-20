import { Module } from '@nestjs/common';
import { UserController } from './api/v1/user.controller';
import { UserService } from './user.service';

/**
 * User 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
