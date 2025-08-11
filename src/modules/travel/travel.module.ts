import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { TravelExpirySchedulerService } from './services/travel-expiry-scheduler.service';
import { Travel } from './travel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Travel, Planet])],
  controllers: [],
  providers: [TravelExpirySchedulerService],
  exports: [TravelExpirySchedulerService],
})
export class TravelModule {}
