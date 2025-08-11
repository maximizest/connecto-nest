import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { Message } from '../message/message.entity';
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';
import { ReadReceiptController } from './api/v1/read-receipt.controller';
import { MessageReadReceipt } from './read-receipt.entity';
import { ReadReceiptService } from './read-receipt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageReadReceipt, Message, Planet, User]),
    CacheModule,
  ],
  providers: [ReadReceiptService],
  controllers: [ReadReceiptController],
  exports: [ReadReceiptService],
})
export class ReadReceiptModule {}
