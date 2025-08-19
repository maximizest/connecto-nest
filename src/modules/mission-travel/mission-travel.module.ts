import { Module } from '@nestjs/common';
import { MissionTravelService } from './mission-travel.service';
import { MissionTravelController } from './api/v1/mission-travel.controller';

/**
 * MissionTravel Module - Active Record Pattern
 * 
 * Repository 주입 없이 MissionTravel 엔티티의 Active Record 메서드를 활용합니다.
 */
@Module({
  controllers: [MissionTravelController],
  providers: [MissionTravelService],
  exports: [MissionTravelService],
})
export class MissionTravelModule {}
