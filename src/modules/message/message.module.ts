import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { MessageController } from './api/v1/message.controller';
import { PlanetAccessGuard } from './guards/planet-access.guard';
import { Message } from './message.entity';
import { MessageService } from './message.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      Planet,
      Travel,
      User,
      TravelUser,
      PlanetUser,
    ]),
  ],
  providers: [MessageService, PlanetAccessGuard],
  controllers: [MessageController],
  exports: [MessageService, PlanetAccessGuard],
})
export class MessageModule {}
