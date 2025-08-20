import { Module } from '@nestjs/common';
import { MissionTravelService } from './mission-travel.service';
import { MissionTravelController } from './api/v1/mission-travel.controller';
import { MissionTravel } from './mission-travel.entity';

/**
 * MissionTravel Module - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 */
@Module({
  imports: [],
  controllers: [MissionTravelController],
  providers: [MissionTravelService],
  exports: [MissionTravelService],
})
export class MissionTravelModule {}
