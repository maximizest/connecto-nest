import { CrudExceptionFilter } from '@foryourdev/nestjs-crud';
import { INestApplication, VersioningType } from '@nestjs/common';
import { ENV_KEYS, HTTP_CONSTANTS } from '../constants/app.constants';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { globalValidationPipe } from '../pipes/validation.pipe';

/**
 * NestJS 애플리케이션의 공통 설정을 적용하는 함수
 */
export function setupGlobalConfiguration(app: INestApplication): void {
  // 전역 파이프 설정 (강화된 검증)
  app.useGlobalPipes(globalValidationPipe);

  // 전역 필터 설정 (순서 중요: 구체적인 필터부터)
  app.useGlobalFilters(
    new GlobalExceptionFilter(), // 가장 일반적인 필터 (최우선)
    new CrudExceptionFilter(), // CRUD 전용 필터
  );

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

  // 테스트 환경 표시
  process.env.NODE_ENV = 'test';

  // 기본 글로벌 설정 적용
  setupGlobalConfiguration(app);
}
