import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { SecurityController } from './api/v1/security.controller';
import {
  EnhancedResourceGuard,
  FileSecurityGuard,
  IpBlockGuard,
  RateLimitGuard,
  UserBehaviorGuard,
} from './guards/security.guard';
import { BlockedIp, FileScanResult, SecurityEvent } from './security.entity';
import { SecurityService } from './security.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityEvent, BlockedIp, FileScanResult]),
    EventEmitterModule.forRoot(),
    CacheModule,
  ],
  providers: [
    SecurityService,
    IpBlockGuard,
    RateLimitGuard,
    FileSecurityGuard,
    UserBehaviorGuard,
    EnhancedResourceGuard,
  ],
  controllers: [SecurityController],
  exports: [
    SecurityService,
    IpBlockGuard,
    RateLimitGuard,
    FileSecurityGuard,
    UserBehaviorGuard,
    EnhancedResourceGuard,
  ],
})
export class SecurityModule {}
