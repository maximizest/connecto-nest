import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from '../profile/profile.entity';
import { UserController } from './api/v1/user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // User 관련 기본 entities
      User,
      Profile, // User와 1:1 관계이므로 유지
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
