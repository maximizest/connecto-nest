import { Module } from '@nestjs/common';
import { AccommodationService } from './accommodation.service';
import { AccommodationController } from './api/v1/accommodation.controller';

/**
 * Accommodation 모듈 - Active Record Pattern
 * 
 * Repository 주입 없이 Accommodation 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [AccommodationController],
  providers: [AccommodationService],
  exports: [AccommodationService],
})
export class AccommodationModule {}
