import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../message/message.entity';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { Analytics } from './analytics.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './api/v1/analytics.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 크론 작업을 위한 스케줄 모듈
    TypeOrmModule.forFeature([
      Analytics,
      Travel,
      Planet,
      User,
      TravelUser,
      PlanetUser,
      Message,
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
