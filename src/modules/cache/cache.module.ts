import { Global, Module } from '@nestjs/common';
import { RedisModule } from './redis.module';
import { CacheStrategy } from './strategies/cache-strategy';
import { CacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheInvalidateInterceptor } from '../../common/interceptors/cache-invalidate.interceptor';

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheStrategy, CacheInterceptor, CacheInvalidateInterceptor],
  controllers: [],
  exports: [
    RedisModule,
    CacheStrategy,
    CacheInterceptor,
    CacheInvalidateInterceptor,
  ],
})
export class CacheModule {}
