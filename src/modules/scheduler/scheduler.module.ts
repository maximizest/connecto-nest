import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { FileUpload } from '../file-upload/file-upload.entity';
import { StorageService } from '../storage/storage.service';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([FileUpload]),
    CacheModule,
  ],
  providers: [SchedulerService, StorageService],
  controllers: [], // 일반 사용자용 컨트롤러 제거 (시스템 내부용으로만 사용)
  exports: [SchedulerService],
})
export class SchedulerModule {}
