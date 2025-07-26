import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { User } from './users/user.entity';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
      },
    }),
    TypeOrmModule.forRoot({
      type: process.env.DATABASE_TYPE as 'postgres' || 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'database',
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || false,
      entities: [User],
      logging: process.env.DATABASE_LOGGING === 'true' || false,
      ssl: process.env.DATABASE_SSL === 'true' ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' || false,
      } : false,
    }),
    UserModule,
    AuthModule,
  ],
})
export class AppModule { }
