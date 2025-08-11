import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { User } from '../user/user.entity';
import { TravelController } from './api/v1/travel.controller';
import { TravelAccessGuard } from './guards/travel-access.guard';
import { TravelExpirySchedulerService } from './services/travel-expiry-scheduler.service';
import { Travel } from './travel.entity';
import { TravelService } from './travel.service';

@Module({
  imports: [TypeOrmModule.forFeature([Travel, Planet, User, TravelUser])],
  controllers: [TravelController],
  providers: [TravelService, TravelAccessGuard, TravelExpirySchedulerService],
  exports: [TravelService, TravelAccessGuard, TravelExpirySchedulerService],
})
export class TravelModule {}
