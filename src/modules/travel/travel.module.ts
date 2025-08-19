import { Module } from '@nestjs/common';
import { TravelController } from './api/v1/travel.controller';
import { TravelService } from './travel.service';

/**
 * Travel 모듈 - Active Record Pattern
 * 
 * Repository 주입 없이 Travel 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [TravelController],
  providers: [TravelService],
  exports: [TravelService],
})
export class TravelModule {}
