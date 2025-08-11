import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { UserController } from './api/v1/user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Travel, Planet, TravelUser, PlanetUser]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
