import { Injectable, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from './redis.service';
import { ModuleRef } from '@nestjs/core';

/**
 * 분산 캐시 서비스
 * 
 * 캐시 무효화를 모든 레플리카에 동기화
 */
@Injectable()
export class DistributedCacheService implements OnModuleInit {
  private readonly logger = new Logger(DistributedCacheService.name);
  private distributedEventService: any;
  
  constructor(
    private readonly redisService: RedisService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    // Lazy loading to avoid circular dependency
    const { DistributedEventService } = await import('../events/distributed-event.service');
    this.distributedEventService = this.moduleRef.get(DistributedEventService, { strict: false });
  }

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
    const patterns: string[] = [];
    
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

  /**
   * 캐시 무효화 이벤트 리스너
   * 다른 레플리카에서 발생한 캐시 무효화 이벤트 처리
   */
  @OnEvent('cache.invalidate')
  async handleCacheInvalidation(data: { patterns: string[]; invalidatedBy: string }) {
    const currentReplica = process.env.RAILWAY_REPLICA_ID || 'default';
    
    // 자신이 발생시킨 이벤트는 무시
    if (data.invalidatedBy === currentReplica) {
      return;
    }
    
    // 로컬 캐시 무효화
    for (const pattern of data.patterns) {
      await this.redisService.invalidatePattern(pattern);
    }
    
    this.logger.debug(`Cache invalidated by replica ${data.invalidatedBy}: ${data.patterns.join(', ')}`);
  }
}