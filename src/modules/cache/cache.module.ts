import { Global, Module } from '@nestjs/common';
import { RedisModule } from './redis.module';
import { DistributedCacheService } from './distributed-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [],
  controllers: [],
  exports: [RedisModule, DistributedCacheService],
})
export class CacheModule {}
