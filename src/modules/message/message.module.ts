import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { MessageController } from './api/v1/message.controller';
import { MessageService } from './message.service';
import { MessagePaginationService } from './services/message-pagination.service';
import { Message } from './message.entity';

/**
 * Message 모듈 - Active Record Pattern
 *
 * TypeOrmModule.forFeature 없이 Active Record 패턴 사용
 * MessagePaginationService는 Redis 캐싱을 위해 CacheModule을 사용합니다.
 */
@Module({
  imports: [CacheModule],
  providers: [MessageService, MessagePaginationService],
  controllers: [MessageController],
  exports: [MessageService, MessagePaginationService],
})
export class MessageModule {}
