import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';
import { PlanetUserController } from './api/v1/planet-user.controller';
import { PlanetUser } from './planet-user.entity';
import { PlanetUserService } from './planet-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanetUser, Planet, User])],
  controllers: [PlanetUserController],
  providers: [PlanetUserService],
  exports: [PlanetUserService],
})
export class PlanetUserModule {}
