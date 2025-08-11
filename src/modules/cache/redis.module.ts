import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisService } from './redis.service';
import { CacheEventManagerService } from './services/cache-event-manager.service';
import { CacheMetricsService } from './services/cache-metrics.service';
import { OnlinePresenceService } from './services/online-presence.service';
import { PlanetCacheService } from './services/planet-cache.service';
import { TravelCacheService } from './services/travel-cache.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    RedisService,
    TravelCacheService,
    PlanetCacheService,
    OnlinePresenceService,
    CacheEventManagerService,
    CacheMetricsService,
  ],
  exports: [
    RedisService,
    TravelCacheService,
    PlanetCacheService,
    OnlinePresenceService,
    CacheEventManagerService,
    CacheMetricsService,
  ],
})
export class RedisModule {}
