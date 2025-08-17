import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { User } from '../user/user.entity';
import { ModerationController } from './api/v1/moderation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Travel, Planet, TravelUser])],
  controllers: [ModerationController],
  providers: [],
  exports: [],
})
export class ModerationModule {}
