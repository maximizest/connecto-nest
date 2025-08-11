import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CacheModule } from '../cache/cache.module';
import { FileUpload } from '../file-upload/file-upload.entity';
import { NotificationModule } from '../notification/notification.module';
import { Planet } from '../planet/planet.entity';
import { StorageService } from '../storage/storage.service';
import { Travel } from '../travel/travel.entity';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { SchedulerController } from './api/v1/scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([Travel, Planet, FileUpload, VideoProcessing]),
    CacheModule,
    NotificationModule,
    AnalyticsModule,
  ],
  providers: [SchedulerService, StorageService],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
