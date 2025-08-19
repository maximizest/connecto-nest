import { Module } from '@nestjs/common';
import { TravelUserController } from './api/v1/travel-user.controller';
import { TravelUserService } from './travel-user.service';

/**
 * TravelUser 모듈 - Active Record Pattern
 * 
 * Repository 주입 없이 TravelUser 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [TravelUserController],
  providers: [TravelUserService],
  exports: [TravelUserService],
})
export class TravelUserModule {}
