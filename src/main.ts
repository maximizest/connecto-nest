import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './modules/app.module';
import { CrudExceptionFilter } from '@foryourdev/nestjs-crud';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  HTTP_CONSTANTS,
  ENV_KEYS,
  LOG_CONSTANTS
} from './common/constants/app.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: process.env[ENV_KEYS.LOG_LEVEL] === 'verbose'
      ? ['log', 'error', 'warn', 'debug', 'verbose'] as const
      : ['log', 'error', 'warn'],
  });

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env[ENV_KEYS.FRONTEND_URL],
    ].filter(Boolean),
    credentials: true,
  });

  // 전역 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // 전역 필터 설정
  app.useGlobalFilters(new CrudExceptionFilter());

  // 전역 인터셉터 설정 (로깅)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API 버전 관리
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION,
    prefix: process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX,
  });

  const port = process.env[ENV_KEYS.PORT] ?? HTTP_CONSTANTS.DEFAULT_PORT;

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/${process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX}${process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION}`);
  logger.log(`🔍 Schema Explorer: http://localhost:${port}/${process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX}${process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION}/schema`);
  logger.log(`🌍 Environment: ${process.env[ENV_KEYS.NODE_ENV] || 'development'}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Application failed to start', error);
  process.exit(1);
});
