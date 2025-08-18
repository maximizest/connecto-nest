import { Module } from '@nestjs/common';
import { RedisModule } from '../cache/redis.module';
import { QueueModule } from '../queue/queue.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    QueueModule, // BullMQ 큐 모듈
    RedisModule, // Redis 모듈
  ],
  providers: [SchedulerService],
  controllers: [], // 일반 사용자용 컨트롤러 제거 (시스템 내부용으로만 사용)
  exports: [SchedulerService],
})
export class SchedulerModule {}
