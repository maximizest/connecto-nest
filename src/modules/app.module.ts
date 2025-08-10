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
import { SchemaModule } from './schema/schema.module';

@Module({
  imports: [
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
    // 개발 환경과 테스트 환경에서만 스키마 모듈 등록, API 문서는 개발 환경에서만
    ...(process.env.NODE_ENV !== 'production'
      ? [
          SchemaModule,
          ...(process.env.NODE_ENV !== 'test'
            ? [
                JestSwagModule.forRoot({
                  path: 'api-docs',
                  title: 'ForyourBiz Template NestJS API Documentation',
                }),
              ]
            : []),
        ]
      : []),
  ],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    console.log('🚀 Application Configuration Validation:');
    validateDatabaseConfig();
    validateJwtConfig();
    console.log('✅ All configurations validated successfully!\n');
  }
}
