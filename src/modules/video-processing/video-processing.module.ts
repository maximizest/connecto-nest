import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { StorageModule } from '../storage/storage.module';
import { VideoProcessingController } from './api/v1/video-processing.controller';
import { VideoProcessing } from './video-processing.entity';
import { VideoProcessingService } from './video-processing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoProcessing]),
    StorageModule,
    FileUploadModule,
  ],
  providers: [VideoProcessingService],
  controllers: [VideoProcessingController],
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
