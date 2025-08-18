import { Global, Module, forwardRef } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DistributedCacheService } from './distributed-cache.service';

@Global()
@Module({
  imports: [
    // EventsModule will be imported in app.module to avoid circular dependency
  ],
  providers: [RedisService, DistributedCacheService],
  exports: [RedisService, DistributedCacheService],
})
export class RedisModule {}
