import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { ReadReceiptController } from './api/v1/read-receipt.controller';
import { MessageReadReceipt } from './read-receipt.entity';
import { ReadReceiptService } from './read-receipt.service';

@Module({
  imports: [CacheModule],
  providers: [ReadReceiptService],
  controllers: [ReadReceiptController],
  exports: [ReadReceiptService],
})
export class ReadReceiptModule {}
