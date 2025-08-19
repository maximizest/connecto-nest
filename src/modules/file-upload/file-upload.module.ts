import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { FileUploadController } from './api/v1/file-upload.controller';
import { FileUpload } from './file-upload.entity';
import { FileUploadService } from './file-upload.service';

@Module({
  imports: [StorageModule],
  providers: [FileUploadService],
  controllers: [FileUploadController],
  exports: [FileUploadService],
})
export class FileUploadModule {}
