import { CrudExceptionFilter } from '@foryourdev/nestjs-crud';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ENV_KEYS, HTTP_CONSTANTS } from '../constants/app.constants';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

/**
 * NestJS 애플리케이션의 공통 설정을 적용하는 함수
 */
export function setupGlobalConfiguration(app: INestApplication): void {
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
    defaultVersion:
      process.env[ENV_KEYS.API_VERSION] || HTTP_CONSTANTS.DEFAULT_API_VERSION,
    prefix:
      process.env[ENV_KEYS.API_PREFIX] || HTTP_CONSTANTS.DEFAULT_API_PREFIX,
  });
}

/**
 * 개발 서버용 CORS 설정
 */
export function setupCorsConfiguration(app: INestApplication): void {
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env[ENV_KEYS.FRONTEND_URL],
    ].filter(Boolean),
    credentials: true,
  });
}

/**
 * 테스트 환경용 설정
 */
export function setupTestConfiguration(app: INestApplication): void {
  // 테스트 환경에서 Schema API 활성화
  process.env.ENABLE_SCHEMA_API = 'true';

  // 기본 글로벌 설정 적용
  setupGlobalConfiguration(app);
}
