import { Module } from '@nestjs/common';
import { TravelUserController } from './api/v1/travel-user.controller';
import { TravelUserService } from './travel-user.service';
import { TravelUser } from './travel-user.entity';

/**
 * TravelUser 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [TravelUserController],
  providers: [TravelUserService],
  exports: [TravelUserService],
})
export class TravelUserModule {}
