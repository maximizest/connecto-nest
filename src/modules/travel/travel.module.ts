import { Module } from '@nestjs/common';
import { TravelController } from './api/v1/travel.controller';
import { TravelService } from './travel.service';
import { Travel } from './travel.entity';

/**
 * Travel 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [TravelController],
  providers: [TravelService],
  exports: [TravelService],
})
export class TravelModule {}
