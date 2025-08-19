import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccommodationService } from './accommodation.service';
import { AccommodationController } from './api/v1/accommodation.controller';
import { Accommodation } from './accommodation.entity';

/**
 * Accommodation 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Accommodation 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Accommodation])],
  controllers: [AccommodationController],
  providers: [AccommodationService],
  exports: [AccommodationService],
})
export class AccommodationModule {}
