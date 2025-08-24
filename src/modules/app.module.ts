import { JestSwagModule } from '@foryourdev/jest-swag';
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
// import { ThrottlerModule } from '@nestjs/throttler'; // Rate Limiting 사용 안함
import { TEST_DATABASE_CONFIG } from '../config/database-test.config';
import {
  DATABASE_CONFIG,
  validateDatabaseConfig,
} from '../config/database.config';
import { JWT_CONFIG, validateJwtConfig } from '../config/jwt.config';
import { validateRedisConfig } from '../config/redis.config';
import { validateStorageConfig } from '../config/storage.config';
import { AccommodationModule } from './accommodation/accommodation.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './cache/redis.module';
import { EventsModule } from './events/events.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { MessageModule } from './message/message.module';
import { MissionModule } from './mission/mission.module';
import { MissionTravelModule } from './mission-travel/mission-travel.module';
import { MissionSubmissionModule } from './mission-submission/mission-submission.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationModule } from './notification/notification.module';
import { PlanetUserModule } from './planet-user/planet-user.module';
import { ReportModule } from './report/report.module';
import { PlanetModule } from './planet/planet.module';
import { ProfileModule } from './profile/profile.module';
import { PushTokenModule } from './push-token/push-token.module';
import { QueueModule } from './queue/queue.module';
import { ReadReceiptModule } from './read-receipt/read-receipt.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SchemaModule } from './schema/schema.module';
import { StorageModule } from './storage/storage.module';
import { I18nModule } from './i18n/i18n.module';
import { TravelUserModule } from './travel-user/travel-user.module';
import { TravelModule } from './travel/travel.module';
import { UserModule } from './user/user.module';
import { WebSocketModule } from './websocket/websocket.module';
import { ReplicaAwareLoggingInterceptor } from '../common/interceptors/replica-aware-logging.interceptor';
// import { DistributedThrottlerGuard } from '../common/guards/distributed-throttler.guard'; // Rate Limiting 사용 안함

const NODE_ENV = process.env.NODE_ENV;
// 기본 모듈 설정
const modules: any[] = [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  JwtModule.register({
    ...JWT_CONFIG,
    global: true,
  }),
  TypeOrmModule.forRoot(
    process.env.NODE_ENV === 'test' ? TEST_DATABASE_CONFIG : DATABASE_CONFIG,
  ),
  ScheduleModule.forRoot(),
  // ThrottlerModule 제거 - Rate Limiting 사용 안함
  EventsModule, // 분산 이벤트 모듈 추가
];

// 개발 && 테스트 환경 모듈
if (NODE_ENV !== 'production') {
  modules.push(SchemaModule);
  modules.push(
    JestSwagModule.forRoot({
      path: 'api-docs',
      title: 'ForyourBiz Template NestJS API Documentation',
    }),
  );
}

// 모듈 추가
modules.push(I18nModule); // i18n 국제화 모듈
modules.push(RedisModule);
modules.push(CacheModule);
modules.push(StorageModule);
modules.push(FileUploadModule);
modules.push(NotificationModule);
modules.push(QueueModule); // BullMQ 큐 모듈
modules.push(SchedulerModule);
modules.push(AuthModule);
modules.push(AdminModule);
modules.push(UserModule);
modules.push(ProfileModule);
modules.push(PushTokenModule);
modules.push(AccommodationModule);
modules.push(TravelModule);
modules.push(TravelUserModule);
modules.push(PlanetModule);
modules.push(PlanetUserModule);
modules.push(MessageModule);
modules.push(MissionModule);
modules.push(MissionTravelModule);
modules.push(MissionSubmissionModule);
modules.push(ReadReceiptModule);
modules.push(ModerationModule);
modules.push(ReportModule);
modules.push(WebSocketModule);

@Module({
  imports: modules,
  providers: [
    // 레플리카 인식 로깅 인터셉터
    {
      provide: APP_INTERCEPTOR,
      useClass: ReplicaAwareLoggingInterceptor,
    },
    // Rate Limiting 사용 안함
    // {
    //   provide: APP_GUARD,
    //   useClass: DistributedThrottlerGuard,
    // },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  async onModuleInit() {
    this.logger.log('🚀 Application Configuration Validation:');
    validateDatabaseConfig();
    validateJwtConfig();
    validateRedisConfig();
    validateStorageConfig();

    // 레플리카 정보 로깅
    const replicaId = process.env.RAILWAY_REPLICA_ID || 'single-instance';
    this.logger.log(`🔄 Running as replica: ${replicaId}`);

    // 개발 환경에서 쿼리 로깅 활성화 (TypeORM 기본 기능)
    if (process.env.NODE_ENV === 'development') {
      this.logger.log('📊 Query logging enabled for development');
      // TypeORM의 기본 로깅 기능 사용 (DATABASE_LOGGING=true)
    }

    this.logger.log('✅ All configurations validated successfully!');
  }
}
