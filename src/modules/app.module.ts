import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    TypeOrmModule.forRoot(DATABASE_CONFIG),
    // 개발 환경에서만 스키마 모듈 등록
    ...(process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
      ? [SchemaModule]
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
