import { DataSourceOptions } from 'typeorm';
import { DATABASE_CONFIG, ENTITIES } from './database.config';

/**
 * 테스트 환경 전용 데이터베이스 설정
 */
export const TEST_DATABASE_CONFIG: DataSourceOptions = {
  ...DATABASE_CONFIG,
  // 테스트용 데이터베이스 이름 (원본 DB와 분리)
  database:
    process.env.TEST_DATABASE_NAME || `${DATABASE_CONFIG.database}_test`,

  // 테스트 환경에서는 항상 synchronize 활성화
  synchronize: true,

  // 로깅 비활성화 (테스트 출력 정리)
  logging: false,

  // 엔티티 목록
  entities: ENTITIES,

  // 캐시 비활성화 (테스트 격리)
  cache: false,

  // 연결 풀 설정 최적화 (테스트용)
  extra: {
    ...DATABASE_CONFIG.extra,
    max: 5, // 테스트에서는 적은 연결 수 사용
    min: 1,
    connectionTimeoutMillis: 10000, // 더 짧은 타임아웃
    application_name: 'nestjs-test',
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
