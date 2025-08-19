import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { MessageController } from './api/v1/message.controller';
import { MessageService } from './message.service';
import { MessagePaginationService } from './services/message-pagination.service';
import { Message } from './message.entity';

/**
 * Message 모듈 - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Message 엔티티의 Active Record 메서드도 활용합니다.
 * MessagePaginationService는 Redis 캐싱을 위해 CacheModule을 사용합니다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Message]), CacheModule],
  providers: [MessageService, MessagePaginationService],
  controllers: [MessageController],
  exports: [MessageService, MessagePaginationService],
})
export class MessageModule {}
