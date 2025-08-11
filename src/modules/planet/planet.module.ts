import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { PlanetController } from './api/v1/planet.controller';
import { DirectPlanetPermissionGuard } from './guards/direct-planet-permission.guard';
import { PlanetAccessGuard } from './guards/planet-access.guard';
import { TimeRestrictionGuard } from './guards/time-restriction.guard';
import { Planet } from './planet.entity';
import { PlanetService } from './planet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Planet, Travel, User, TravelUser, PlanetUser]),
  ],
  controllers: [PlanetController],
  providers: [
    PlanetService,
    PlanetAccessGuard,
    DirectPlanetPermissionGuard,
    TimeRestrictionGuard,
  ],
  exports: [
    PlanetService,
    PlanetAccessGuard,
    DirectPlanetPermissionGuard,
    TimeRestrictionGuard,
  ],
})
export class PlanetModule {}
