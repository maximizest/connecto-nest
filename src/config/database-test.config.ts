import { DataSourceOptions } from 'typeorm';
import { ENV_KEYS } from '../common/constants/app.constants';
import { ENTITIES } from './database.config';

/**
 * 테스트 환경 전용 데이터베이스 설정
 */
export const TEST_DATABASE_CONFIG: DataSourceOptions = {
  type: 'postgres',
  host:
    process.env.TEST_DATABASE_HOST ||
    process.env[ENV_KEYS.DATABASE_HOST] ||
    'localhost',
  port: parseInt(
    process.env.TEST_DATABASE_PORT ||
      process.env[ENV_KEYS.DATABASE_PORT] ||
      '5432',
  ),
  username:
    process.env.TEST_DATABASE_USERNAME ||
    process.env[ENV_KEYS.DATABASE_USERNAME] ||
    'postgres',
  password:
    process.env.TEST_DATABASE_PASSWORD ||
    process.env[ENV_KEYS.DATABASE_PASSWORD] ||
    'password',

  // 테스트용 데이터베이스 이름 (원본 DB와 구분)
  database: process.env.TEST_DATABASE_NAME || 'test_db',

  // 테스트 환경에서는 항상 synchronize 활성화 (스키마 자동 생성)
  synchronize: true,

  // 로깅 비활성화 (테스트 출력 정리)
  logging: false,

  // 엔티티 목록
  entities: ENTITIES,

  // 캐시 비활성화 (테스트 격리)
  cache: false,

  // SSL 설정 (Railway 등 클라우드 DB 사용 시)
  ssl:
    process.env.TEST_DATABASE_SSL === 'true' ||
    process.env[ENV_KEYS.DATABASE_SSL] === 'true'
      ? {
          rejectUnauthorized:
            process.env.TEST_DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' &&
            process.env[ENV_KEYS.DATABASE_SSL_REJECT_UNAUTHORIZED] !== 'false',
        }
      : false,

  // 연결 풀 설정 최적화 (테스트용)
  extra: {
    max: 3, // 테스트에서는 더 적은 연결 수 사용
    min: 1,
    connectionTimeoutMillis: 5000, // 더 짧은 타임아웃
    idleTimeoutMillis: 10000,
    application_name: 'nestjs-e2e-test',
  },

  // 쿼리 실행 시간 모니터링 비활성화
  maxQueryExecutionTime: undefined,
};

/**
 * 테스트 환경용 환경변수 검증 (조용한 버전)
 */
export const validateTestDatabaseConfig = (): void => {
  // 테스트 환경에서는 검증만 하고 출력은 최소화
  const requiredVars = [
    'DATABASE_HOST',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing test database environment variables: ${missingVars.join(', ')}`,
    );
  }
};
