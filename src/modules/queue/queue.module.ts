import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueAdminController } from './api/admin/queue-admin.controller';
import { FileCleanupProcessor } from './processors/file-cleanup.processor';
import { ExpiredTravelProcessor } from './processors/expired-travel.processor';
import { CacheCleanupProcessor } from './processors/cache-cleanup.processor';
import { QueueService } from './queue.service';
import { StorageModule } from '../storage/storage.module';
import { RedisModule } from '../cache/redis.module';
import { TravelModule } from '../travel/travel.module';

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    RedisModule,
    TravelModule,
    // BullMQ 전역 설정
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
          password: configService.get('REDIS_PASSWORD'),
          db: parseInt(configService.get('REDIS_DB', '0'), 10),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          reconnectOnError: (err: Error) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              // Redis가 읽기 전용 모드일 때 재연결
              return true;
            }
            return false;
          },
        },
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // 1시간 후 완료된 작업 제거
            count: 100, // 최대 100개의 완료된 작업 유지
          },
          removeOnFail: {
            age: 86400, // 24시간 후 실패한 작업 제거
            count: 500, // 최대 500개의 실패한 작업 유지
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    // 각 Queue 등록
    BullModule.registerQueue(
      {
        name: 'file-cleanup',
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      },
      {
        name: 'expired-travel',
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      },
      {
        name: 'cache-cleanup',
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 5,
        },
      },
    ),
  ],
  controllers: [QueueAdminController],
  providers: [
    QueueService,
    FileCleanupProcessor,
    ExpiredTravelProcessor,
    CacheCleanupProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
