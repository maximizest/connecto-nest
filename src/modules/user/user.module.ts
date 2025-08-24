import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './api/v1/user.controller';
import { UserService } from './user.service';
import { ProfileModule } from '../profile/profile.module';
import { CacheModule } from '../cache/cache.module';

/**
 * User 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [
    forwardRef(() => ProfileModule),
    CacheModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
