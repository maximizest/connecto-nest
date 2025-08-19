import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionTravel } from './mission-travel.entity';
import { MissionTravelService } from './mission-travel.service';
import { MissionTravelController } from './api/v1/mission-travel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MissionTravel])],
  controllers: [MissionTravelController],
  providers: [MissionTravelService],
  exports: [MissionTravelService],
})
export class MissionTravelModule {}
