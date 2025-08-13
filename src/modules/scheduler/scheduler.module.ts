import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { FileUpload } from '../file-upload/file-upload.entity';
import { Message } from '../message/message.entity';
import { Notification } from '../notification/notification.entity';
import { NotificationModule } from '../notification/notification.module';
import { Planet } from '../planet/planet.entity';
import { MessageReadReceipt } from '../read-receipt/read-receipt.entity';
import { StorageService } from '../storage/storage.service';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { SchedulerController } from './api/v1/scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      Travel,
      Planet,
      Message,
      MessageReadReceipt,
      User,
      FileUpload,
      VideoProcessing,
      Notification,
    ]),
    CacheModule,
    NotificationModule,
  ],
  providers: [SchedulerService, StorageService],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
