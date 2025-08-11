import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet } from '../planet/planet.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { OnlinePresenceController } from './api/v1/online-presence.controller';
import { RedisModule } from './redis.module';
import { OnlinePresenceService } from './services/online-presence.service';
import { PlanetCacheService } from './services/planet-cache.service';

@Global()
@Module({
  imports: [RedisModule, TypeOrmModule.forFeature([User, Travel, Planet])],
  providers: [OnlinePresenceService, PlanetCacheService],
  controllers: [OnlinePresenceController],
  exports: [OnlinePresenceService, PlanetCacheService],
})
export class CacheModule {}
