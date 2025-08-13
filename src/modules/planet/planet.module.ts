import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { PlanetController } from './api/v1/planet.controller';
import { Planet } from './planet.entity';
import { PlanetService } from './planet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Planet, Travel, User, TravelUser, PlanetUser]),
  ],
  controllers: [PlanetController],
  providers: [PlanetService],
  exports: [PlanetService],
})
export class PlanetModule {}
