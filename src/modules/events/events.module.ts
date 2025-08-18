import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '../cache/redis.module';
import { DistributedEventService } from './distributed-event.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    RedisModule,
  ],
  providers: [DistributedEventService],
  exports: [DistributedEventService],
})
export class EventsModule {}
