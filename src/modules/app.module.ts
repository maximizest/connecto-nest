import { JestSwagModule } from '@foryourdev/jest-swag';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { RedisModule } from './cache/redis.module';
import { SchemaModule } from './schema/schema.module';
import { StorageModule } from './storage/storage.module';

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
modules.push(StorageModule);
modules.push(AdminModule);

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
