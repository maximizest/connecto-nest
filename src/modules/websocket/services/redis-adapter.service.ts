import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import * as Redis from 'ioredis';

/**
 * Redis Adapter Service
 * 
 * Socket.io 서버 간 메시지 동기화를 위한 Redis Adapter 관리
 * 멀티 레플리카 환경에서 WebSocket 이벤트를 모든 서버에 전파
 */
@Injectable()
export class RedisAdapterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisAdapterService.name);
  private pubClient: Redis.Redis;
  private subClient: Redis.Redis;
  private isInitialized = false;

  async onModuleInit() {
    await this.initializeRedisClients();
  }

  /**
   * Redis 클라이언트 초기화
   */
  private async initializeRedisClients() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.logger.log('Initializing Redis clients for Socket.io adapter...');
      
      // Redis URL 파싱
      const redisOptions = this.parseRedisUrl(redisUrl);
      
      // Publisher 클라이언트
      this.pubClient = new Redis({
        ...redisOptions,
        retryStrategy: (times) => {
          if (times > 10) {
            this.logger.error('Redis retry limit reached');
            return null;
          }
          const delay = Math.min(times * 100, 3000);
          this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });
      
      // Subscriber 클라이언트 (Publisher 복제)
      this.subClient = this.pubClient.duplicate();
      
      // 에러 핸들링
      this.pubClient.on('error', (err) => {
        this.logger.error('Redis pub client error:', err);
      });
      
      this.subClient.on('error', (err) => {
        this.logger.error('Redis sub client error:', err);
      });
      
      // 연결 상태 모니터링
      this.pubClient.on('connect', () => {
        this.logger.log('Redis pub client connected');
      });
      
      this.subClient.on('connect', () => {
        this.logger.log('Redis sub client connected');
      });
      
      this.pubClient.on('ready', () => {
        this.logger.log('Redis pub client ready');
      });
      
      this.subClient.on('ready', () => {
        this.logger.log('Redis sub client ready');
      });
      
      // 연결 대기
      await Promise.all([
        this.waitForConnection(this.pubClient, 'publisher'),
        this.waitForConnection(this.subClient, 'subscriber')
      ]);
      
      this.isInitialized = true;
      this.logger.log('Redis adapter clients initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis clients:', error);
      throw error;
    }
  }

  /**
   * Redis URL 파싱
   */
  private parseRedisUrl(url: string): Redis.RedisOptions {
    try {
      const redisUrl = new URL(url);
      
      const options: Redis.RedisOptions = {
        port: parseInt(redisUrl.port) || 6379,
        host: redisUrl.hostname || 'localhost',
      };
      
      if (redisUrl.password) {
        options.password = redisUrl.password;
      }
      
      if (redisUrl.username) {
        options.username = redisUrl.username;
      }
      
      // DB 번호 추출 (path에서)
      if (redisUrl.pathname && redisUrl.pathname !== '/') {
        const db = parseInt(redisUrl.pathname.substr(1));
        if (!isNaN(db)) {
          options.db = db;
        }
      }
      
      return options;
    } catch (error) {
      this.logger.warn('Failed to parse Redis URL, using defaults');
      return {
        port: 6379,
        host: 'localhost',
      };
    }
  }

  /**
   * Redis 클라이언트 연결 대기
   */
  private async waitForConnection(client: Redis.Redis, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${type} client connection timeout`));
      }, 10000); // 10초 타임아웃

      if (client.status === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      client.once('ready', () => {
        clearTimeout(timeout);
        this.logger.log(`Redis ${type} client connected and ready`);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Socket.io 서버에 Redis Adapter 적용
   */
  async setupAdapter(io: Server): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeRedisClients();
    }

    try {
      const adapter = createAdapter(this.pubClient, this.subClient);
      io.adapter(adapter);
      
      this.logger.log('Redis adapter attached to Socket.io server');
      
      // Adapter 이벤트 모니터링
      io.of('/').adapter.on('error', (err) => {
        this.logger.error('Redis adapter error:', err);
      });
      
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter:', error);
      throw error;
    }
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pubClient || !this.subClient) {
        return false;
      }
      
      // Redis PING 명령으로 연결 확인
      const pubPing = await this.pingClient(this.pubClient);
      const subPing = await this.pingClient(this.subClient);
      
      return pubPing && subPing;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Redis 클라이언트 PING
   */
  private async pingClient(client: Redis.Redis): Promise<boolean> {
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Ping failed:', error);
      return false;
    }
  }

  /**
   * 클린업
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up Redis adapter clients...');
    
    if (this.pubClient) {
      await this.pubClient.quit();
    }
    
    if (this.subClient) {
      await this.subClient.quit();
    }
    
    this.isInitialized = false;
  }

  /**
   * 어댑터 통계 조회
   */
  async getAdapterStats(): Promise<any> {
    return {
      initialized: this.isInitialized,
      pubClientStatus: this.pubClient?.status || 'disconnected',
      subClientStatus: this.subClient?.status || 'disconnected',
      pubClientConnected: this.pubClient?.status === 'ready',
      subClientConnected: this.subClient?.status === 'ready',
    };
  }
}