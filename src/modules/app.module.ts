import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DATABASE_CONFIG, validateDatabaseConfig } from '../config/database.config';
import { JWT_CONFIG, validateJwtConfig } from '../config/jwt.config';
import { UserModule } from './users/user.module';
import { PostModule } from './posts/post.module';
import { AuthModule } from './auth/auth.module';
import { SchemaModule } from './schema/schema.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register(JWT_CONFIG),
    TypeOrmModule.forRoot(DATABASE_CONFIG),
    UserModule,
    PostModule,
    AuthModule,
    // 개발 환경에서만 스키마 모듈 등록
    ...(process.env.NODE_ENV === 'development' || !process.env.NODE_ENV ? [SchemaModule] : []),
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
