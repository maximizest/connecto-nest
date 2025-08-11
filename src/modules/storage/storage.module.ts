import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
