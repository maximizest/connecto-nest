import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { TravelUserController } from './api/v1/travel-user.controller';
import { TravelUser } from './travel-user.entity';
import { TravelUserService } from './travel-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TravelUser, Travel, Planet, PlanetUser, User]),
  ],
  controllers: [TravelUserController],
  providers: [TravelUserService],
  exports: [TravelUserService],
})
export class TravelUserModule {}
