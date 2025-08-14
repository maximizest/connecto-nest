import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { User } from '../user/user.entity';
import { VideoProcessingModule } from '../video-processing/video-processing.module';
import { FileUploadController } from './api/v1/file-upload.controller';
import { FileUpload } from './file-upload.entity';
import { FileUploadService } from './file-upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileUpload, User]),
    StorageModule,
    forwardRef(() => VideoProcessingModule), // 비디오 자동 처리를 위해 추가 (순환 의존성 해결)
  ],
  providers: [FileUploadService],
  controllers: [FileUploadController],
  exports: [FileUploadService],
})
export class FileUploadModule {}
