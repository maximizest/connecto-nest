import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DistributedEventService } from '../events/distributed-event.service';

/**
 * 분산 캐시 서비스
 * 
 * 캐시 무효화를 모든 레플리카에 동기화
 */
@Injectable()
export class DistributedCacheService {
  private readonly logger = new Logger(DistributedCacheService.name);
  
  constructor(
    private readonly redisService: RedisService,
    private readonly distributedEventService: DistributedEventService,
  ) {}

  /**
   * 분산 캐시 무효화
   * 모든 레플리카에 캐시 무효화 이벤트 전파
   */
  async invalidateAcrossReplicas(patterns: string[]): Promise<void> {
    try {
      // 로컬 캐시 무효화
      for (const pattern of patterns) {
        await this.redisService.invalidatePattern(pattern);
      }
      
      // 다른 레플리카에 무효화 이벤트 전파
      await this.distributedEventService.emitDistributed('cache.invalidate', {
        patterns,
        invalidatedBy: process.env.RAILWAY_REPLICA_ID || 'default',
      });
      
      this.logger.log(`Cache invalidated across replicas: ${patterns.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache across replicas: ${error.message}`);
    }
  }

  /**
   * 엔티티별 캐시 무효화
   */
  async invalidateEntity(entityType: string, entityId?: number): Promise<void> {
    const patterns = [];
    
    if (entityId) {
      patterns.push(`${entityType}:${entityId}:*`);
    } else {
      patterns.push(`${entityType}:*`);
    }
    
    await this.invalidateAcrossReplicas(patterns);
  }

  /**
   * 사용자별 캐시 무효화
   */
  async invalidateUserCache(userId: number): Promise<void> {
    const patterns = [
      `user:${userId}:*`,
      `session:${userId}`,
      `profile:${userId}:*`,
    ];
    
    await this.invalidateAcrossReplicas(patterns);
  }
}