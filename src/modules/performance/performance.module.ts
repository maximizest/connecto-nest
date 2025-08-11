import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { NotificationModule } from '../notification/notification.module';

import {
  CachePerformanceInterceptor,
  DatabasePerformanceInterceptor,
  PerformanceInterceptor,
} from './interceptors/performance.interceptor';
import { PerformanceAlert, PerformanceMetric } from './performance.entity';
import { PerformanceService } from './performance.service';
import { SystemMonitoringService } from './services/system-monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PerformanceMetric, PerformanceAlert]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CacheModule,
    NotificationModule,
  ],
  providers: [
    PerformanceService,
    SystemMonitoringService,
    PerformanceInterceptor,
    DatabasePerformanceInterceptor,
    CachePerformanceInterceptor,
  ],
  controllers: [],
  exports: [
    PerformanceService,
    SystemMonitoringService,
    PerformanceInterceptor,
    DatabasePerformanceInterceptor,
    CachePerformanceInterceptor,
  ],
})
export class PerformanceModule {}
