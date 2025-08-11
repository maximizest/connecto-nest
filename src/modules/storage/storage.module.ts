import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadController } from './api/v1/file-upload.controller';
import { StreamingController } from './api/v1/streaming.controller';
import { VideoProcessingController } from './api/v1/video-processing.controller';
import { FileUpload } from './file-upload.entity';
import { FileUploadService } from './file-upload.service';
import { StorageService } from './storage.service';
import { StreamingSession } from './streaming-session.entity';
import { StreamingService } from './streaming.service';
import { VideoProcessing } from './video-processing.entity';
import { VideoProcessingService } from './video-processing.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([FileUpload, VideoProcessing, StreamingSession]),
  ],
  controllers: [
    FileUploadController,
    VideoProcessingController,
    StreamingController,
  ],
  providers: [
    StorageService,
    FileUploadService,
    VideoProcessingService,
    StreamingService,
  ],
  exports: [
    StorageService,
    FileUploadService,
    VideoProcessingService,
    StreamingService,
  ],
})
export class StorageModule {}
