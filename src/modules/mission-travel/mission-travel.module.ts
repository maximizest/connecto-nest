import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionTravelService } from './mission-travel.service';
import { MissionTravelController } from './api/v1/mission-travel.controller';
import { MissionTravel } from './mission-travel.entity';

/**
 * MissionTravel Module - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 MissionTravel 엔티티의 Active Record 메서드도 활용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MissionTravel])],
  controllers: [MissionTravelController],
  providers: [MissionTravelService],
  exports: [MissionTravelService],
})
export class MissionTravelModule {}
