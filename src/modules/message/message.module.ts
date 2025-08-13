import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { PlanetUser } from '../planet-user/planet-user.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { MessageController } from './api/v1/message.controller';
import { Message } from './message.entity';
import { MessageService } from './message.service';
import { MessagePaginationService } from './services/message-pagination.service';

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
    CacheModule,
  ],
  providers: [MessageService, MessagePaginationService],
  controllers: [MessageController],
  exports: [MessageService, MessagePaginationService],
})
export class MessageModule {}
