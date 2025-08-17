import * as dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import {
  DATABASE_CONSTANTS,
  ENV_KEYS,
} from '../common/constants/app.constants';
import { FileUpload } from '../modules/file-upload/file-upload.entity';
import { Message } from '../modules/message/message.entity';
import { Notification } from '../modules/notification/notification.entity';
import { PlanetUser } from '../modules/planet-user/planet-user.entity';
import { Planet } from '../modules/planet/planet.entity';
import { Profile } from '../modules/profile/profile.entity';
import { MessageReadReceipt } from '../modules/read-receipt/read-receipt.entity';
import { TravelUser } from '../modules/travel-user/travel-user.entity';
import { Travel } from '../modules/travel/travel.entity';
import { User } from '../modules/user/user.entity';

// 테스트 환경 검증 함수를 별도로 임포트하지 않고 여기서 정의
const validateTestDatabaseConfig = (): void => {
  const requiredVars = [
    ENV_KEYS.DATABASE_HOST,
    ENV_KEYS.DATABASE_USERNAME,
    ENV_KEYS.DATABASE_PASSWORD,
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing test database environment variables: ${missingVars.join(', ')}`,
    );
  }
};

// 환경변수 로드
dotenv.config();

/**
 * 모든 엔티티 목록 (중앙 관리)
 */
export const ENTITIES = [
  User,
  Profile, // User와 1:1 관계의 프로필 정보
  Travel,
  TravelUser,
  Planet,
  PlanetUser,
  Message,
  MessageReadReceipt,
  Notification,
  FileUpload,
];

/**
 * 공통 데이터베이스 설정
 */
export const DATABASE_CONFIG: DataSourceOptions = {
  type: (process.env[ENV_KEYS.DATABASE_TYPE] as 'postgres') || 'postgres',
  host: process.env[ENV_KEYS.DATABASE_HOST] || 'localhost',
  port: parseInt(
    process.env[ENV_KEYS.DATABASE_PORT] ||
      DATABASE_CONSTANTS.DEFAULT_PORT.toString(),
  ),
  username: process.env[ENV_KEYS.DATABASE_USERNAME] || 'postgres',
  password: process.env[ENV_KEYS.DATABASE_PASSWORD] || 'password',
  database: process.env[ENV_KEYS.DATABASE_NAME] || 'database',
  entities: ENTITIES,
  synchronize: process.env[ENV_KEYS.DATABASE_SYNCHRONIZE] === 'true' || false,
  logging: process.env[ENV_KEYS.DATABASE_LOGGING] === 'true' || false,

  // SSL 설정 개선
  ssl:
    process.env[ENV_KEYS.DATABASE_SSL] === 'true'
      ? {
          rejectUnauthorized:
            process.env[ENV_KEYS.DATABASE_SSL_REJECT_UNAUTHORIZED] !== 'false',
        }
      : false,

  // 연결 풀 설정 추가
  extra: {
    // 최대 연결 수
    max: parseInt(
      process.env[ENV_KEYS.DATABASE_MAX_CONNECTIONS] ||
        DATABASE_CONSTANTS.DEFAULT_MAX_CONNECTIONS.toString(),
    ),
    // 최소 연결 수
    min: parseInt(
      process.env[ENV_KEYS.DATABASE_MIN_CONNECTIONS] ||
        DATABASE_CONSTANTS.DEFAULT_MIN_CONNECTIONS.toString(),
    ),
    // 연결 시간 초과 (밀리초)
    connectionTimeoutMillis: parseInt(
      process.env[ENV_KEYS.DATABASE_CONNECTION_TIMEOUT] ||
        DATABASE_CONSTANTS.DEFAULT_CONNECTION_TIMEOUT.toString(),
    ),
    // 유휴 연결 제거 시간 (밀리초)
    idleTimeoutMillis: 30000,
    // 연결 풀 이름
    application_name: 'nestjs-app',
  },

  // 쿼리 성능 모니터링
  maxQueryExecutionTime: DATABASE_CONSTANTS.QUERY_EXECUTION_TIME_WARNING,

  // 캐시 설정
  cache: {
    type: 'database',
    duration: DATABASE_CONSTANTS.CACHE_DURATION,
    ignoreErrors: true,
  },
};

/**
 * 마이그레이션용 설정 (migrations 경로 추가)
 */
export const MIGRATION_CONFIG: DataSourceOptions = {
  ...DATABASE_CONFIG,
  migrations: ['./src/migrations/*.ts'],
  migrationsRun: false, // 자동 마이그레이션 실행 방지
  migrationsTableName: 'migrations_history',
};

/**
 * 환경변수 검증 강화
 */
export const validateDatabaseConfig = () => {
  // 테스트 환경에서는 조용히 검증
  if (process.env.NODE_ENV === 'test') {
    return validateTestDatabaseConfig();
  }
  const requiredEnvVars = [
    ENV_KEYS.DATABASE_HOST,
    ENV_KEYS.DATABASE_PORT,
    ENV_KEYS.DATABASE_USERNAME,
    ENV_KEYS.DATABASE_PASSWORD,
    ENV_KEYS.DATABASE_NAME,
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error('❌ Missing required database environment variables:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your environment variables and try again.');
    process.exit(1);
  }

  // 데이터베이스 포트 검증
  const port = parseInt(
    process.env[ENV_KEYS.DATABASE_PORT] ||
      DATABASE_CONSTANTS.DEFAULT_PORT.toString(),
  );
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(
      `❌ ${ENV_KEYS.DATABASE_PORT} must be a valid port number (1-65535)`,
    );
    process.exit(1);
  }

  // 연결 풀 설정 검증
  const maxConnections = parseInt(
    process.env[ENV_KEYS.DATABASE_MAX_CONNECTIONS] ||
      DATABASE_CONSTANTS.DEFAULT_MAX_CONNECTIONS.toString(),
  );
  const minConnections = parseInt(
    process.env[ENV_KEYS.DATABASE_MIN_CONNECTIONS] ||
      DATABASE_CONSTANTS.DEFAULT_MIN_CONNECTIONS.toString(),
  );

  if (maxConnections < minConnections) {
    console.error(
      `❌ ${ENV_KEYS.DATABASE_MAX_CONNECTIONS} must be greater than ${ENV_KEYS.DATABASE_MIN_CONNECTIONS}`,
    );
    process.exit(1);
  }

  // Synchronize 프로덕션 환경 경고
  if (
    process.env[ENV_KEYS.NODE_ENV] === 'production' &&
    process.env[ENV_KEYS.DATABASE_SYNCHRONIZE] === 'true'
  ) {
    console.error(
      `❌ ${ENV_KEYS.DATABASE_SYNCHRONIZE}=true is not recommended in production`,
    );
    console.error('   Please use migrations instead');
    process.exit(1);
  }

  console.log('✅ Database Configuration validated');
  console.log(`   - Host: ${DATABASE_CONFIG.host}:${DATABASE_CONFIG.port}`);
  console.log(`   - Database: ${DATABASE_CONFIG.database}`);
  console.log(`   - SSL: ${DATABASE_CONFIG.ssl ? 'enabled' : 'disabled'}`);
  console.log(
    `   - Connection Pool: ${minConnections}-${maxConnections} connections`,
  );
  console.log(
    `   - Synchronize: ${DATABASE_CONFIG.synchronize ? 'enabled' : 'disabled'}`,
  );
  console.log(
    `   - Logging: ${DATABASE_CONFIG.logging ? 'enabled' : 'disabled'}`,
  );
};
