import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadController } from './api/v1/file-upload.controller';
import { VideoProcessingController } from './api/v1/video-processing.controller';
import { FileUpload } from './file-upload.entity';
import { FileUploadService } from './file-upload.service';
import { StorageService } from './storage.service';
import { VideoProcessing } from './video-processing.entity';
import { VideoProcessingService } from './video-processing.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FileUpload, VideoProcessing])],
  controllers: [FileUploadController, VideoProcessingController],
  providers: [StorageService, FileUploadService, VideoProcessingService],
  exports: [StorageService, FileUploadService, VideoProcessingService],
})
export class StorageModule {}
