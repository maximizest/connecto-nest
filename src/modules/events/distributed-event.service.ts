import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../cache/redis.service';

/**
 * 분산 이벤트 서비스
 * 
 * EventEmitter2 이벤트를 Redis Pub/Sub을 통해 모든 레플리카에 전파
 */
@Injectable()
export class DistributedEventService {
  private readonly logger = new Logger(DistributedEventService.name);
  private readonly CHANNEL_PREFIX = 'events:';
  
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {
    this.subscribeToDistributedEvents();
  }

  /**
   * 분산 이벤트 발행 (모든 레플리카에 전파)
   */
  async emitDistributed(event: string, data: any): Promise<void> {
    try {
      // 로컬 이벤트 발행
      this.eventEmitter.emit(event, data);
      
      // Redis를 통해 다른 레플리카에 전파
      const channel = `${this.CHANNEL_PREFIX}${event}`;
      const message = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        source: process.env.RAILWAY_REPLICA_ID || 'default',
      });
      
      await this.redisService.getClient().publish(channel, message);
      
      this.logger.debug(`Distributed event published: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to emit distributed event: ${error.message}`);
      // 실패해도 로컬 이벤트는 이미 발행됨
    }
  }

  /**
   * 분산 이벤트 구독 설정
   */
  private async subscribeToDistributedEvents() {
    try {
      const subscriber = this.redisService.getClient().duplicate();
      
      // 패턴 구독 (events:* 형태의 모든 채널)
      await subscriber.psubscribe(`${this.CHANNEL_PREFIX}*`);
      
      subscriber.on('pmessage', (pattern, channel, message) => {
        try {
          const parsed = JSON.parse(message);
          const currentReplica = process.env.RAILWAY_REPLICA_ID || 'default';
          
          // 자신이 발행한 이벤트는 무시 (중복 방지)
          if (parsed.source === currentReplica) {
            return;
          }
          
          // 로컬 EventEmitter로 이벤트 발행
          this.eventEmitter.emit(parsed.event, parsed.data);
          
          this.logger.debug(`Distributed event received: ${parsed.event} from ${parsed.source}`);
        } catch (error) {
          this.logger.error(`Failed to process distributed event: ${error.message}`);
        }
      });
      
      this.logger.log('Distributed event subscriber initialized');
    } catch (error) {
      this.logger.error(`Failed to setup distributed event subscriber: ${error.message}`);
    }
  }
}