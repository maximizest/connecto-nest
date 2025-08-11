import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { StorageModule } from '../storage/storage.module';
import { VideoProcessing } from '../video-processing/video-processing.entity';
import { StreamingController } from './api/v1/streaming.controller';
import { StreamingSession } from './streaming-session.entity';
import { StreamingService } from './streaming.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StreamingSession, VideoProcessing]),
    CacheModule,
    StorageModule,
  ],
  providers: [StreamingService],
  controllers: [StreamingController],
  exports: [StreamingService],
})
export class StreamingModule {}
