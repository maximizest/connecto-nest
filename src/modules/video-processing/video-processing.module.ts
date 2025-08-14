import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { StorageModule } from '../storage/storage.module';
import { VideoProcessing } from './video-processing.entity';
import { VideoProcessingService } from './video-processing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoProcessing]),
    StorageModule,
    forwardRef(() => FileUploadModule), // 순환 의존성 해결
  ],
  providers: [VideoProcessingService],
  controllers: [], // 사용자 API 제거 (자동 처리만 지원)
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
