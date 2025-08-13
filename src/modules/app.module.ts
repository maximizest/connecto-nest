import { JestSwagModule } from '@foryourdev/jest-swag';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TEST_DATABASE_CONFIG } from '../config/database-test.config';
import {
  DATABASE_CONFIG,
  validateDatabaseConfig,
} from '../config/database.config';
import { JWT_CONFIG, validateJwtConfig } from '../config/jwt.config';
import { validateRedisConfig } from '../config/redis.config';
import { validateStorageConfig } from '../config/storage.config';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CacheModule } from './cache/cache.module';
import { RedisModule } from './cache/redis.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { MessageModule } from './message/message.module';
import { NotificationModule } from './notification/notification.module';
import { PlanetUserModule } from './planet-user/planet-user.module';
import { PlanetModule } from './planet/planet.module';
import { ProfileModule } from './profile/profile.module';
import { ReadReceiptModule } from './read-receipt/read-receipt.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SchemaModule } from './schema/schema.module';
import { SecurityModule } from './security/security.module';
import { StorageModule } from './storage/storage.module';
import { StreamingModule } from './streaming/streaming.module';
import { TravelUserModule } from './travel-user/travel-user.module';
import { TravelModule } from './travel/travel.module';
import { UserModule } from './user/user.module';
import { VideoProcessingModule } from './video-processing/video-processing.module';
import { WebSocketModule } from './websocket/websocket.module';

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
modules.push(RedisModule);
modules.push(CacheModule);
modules.push(StorageModule);
modules.push(FileUploadModule);
modules.push(StreamingModule);
modules.push(VideoProcessingModule);
modules.push(NotificationModule);
modules.push(AnalyticsModule);
modules.push(SecurityModule);
modules.push(SchedulerModule);
modules.push(AdminModule);
modules.push(UserModule);
modules.push(ProfileModule); // User와 1:1 관계의 프로필 모듈
modules.push(TravelModule);
modules.push(TravelUserModule);
modules.push(PlanetModule);
modules.push(PlanetUserModule);
modules.push(MessageModule);
modules.push(ReadReceiptModule);
modules.push(WebSocketModule);

@Module({
  imports: modules,
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    console.log('🚀 Application Configuration Validation:');
    validateDatabaseConfig();
    validateJwtConfig();
    validateRedisConfig();
    validateStorageConfig();
    console.log('✅ All configurations validated successfully!\n');
  }
}
