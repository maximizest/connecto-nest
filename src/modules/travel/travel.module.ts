import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelController } from './api/v1/travel.controller';
import { TravelService } from './travel.service';
import { Travel } from './travel.entity';

/**
 * Travel 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Travel 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Travel])],
  controllers: [TravelController],
  providers: [TravelService],
  exports: [TravelService],
})
export class TravelModule {}
