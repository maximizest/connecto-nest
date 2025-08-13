import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { FileUpload } from '../file-upload/file-upload.entity';
import { StorageService } from '../storage/storage.service';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { SchedulerController } from './api/v1/scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([FileUpload, VideoProcessing]),
    CacheModule,
  ],
  providers: [SchedulerService, StorageService],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
