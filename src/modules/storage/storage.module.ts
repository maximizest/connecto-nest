import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadController } from './api/v1/file-upload.controller';
import { FileUpload } from './file-upload.entity';
import { FileUploadService } from './file-upload.service';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FileUpload])],
  controllers: [FileUploadController],
  providers: [StorageService, FileUploadService],
  exports: [StorageService, FileUploadService],
})
export class StorageModule {}
