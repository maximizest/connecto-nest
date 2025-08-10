import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  setupCorsConfiguration,
  setupGlobalConfiguration,
} from './common/config/app-setup.config';
import { ENV_KEYS, HTTP_CONSTANTS } from './common/constants/app.constants';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env[ENV_KEYS.LOG_LEVEL] === 'verbose'
        ? (['log', 'error', 'warn', 'debug', 'verbose'] as const)
        : ['log', 'error', 'warn'],
  });

  // CORS 설정 적용
  setupCorsConfiguration(app);

  // 전역 설정 적용
  setupGlobalConfiguration(app);

  const port = process.env[ENV_KEYS.PORT] ?? HTTP_CONSTANTS.DEFAULT_PORT;

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `📚 API Documentation: http://localhost:${port}/${process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX}${process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION}`,
  );
  logger.log(
    `🔍 Schema Explorer: http://localhost:${port}/${process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX}${process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION}/schema`,
  );
  logger.log(
    `🌍 Environment: ${process.env[ENV_KEYS.NODE_ENV] || 'development'}`,
  );
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Application failed to start', error);
  process.exit(1);
});
