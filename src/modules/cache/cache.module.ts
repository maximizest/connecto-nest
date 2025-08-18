import { Global, Module } from '@nestjs/common';
import { RedisModule } from './redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [],
  controllers: [],
  exports: [RedisModule],
})
export class CacheModule {}
