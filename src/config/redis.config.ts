import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import { ENV_KEYS } from '../common/constants/app.constants';

// 환경변수 로드
dotenv.config();

/**
 * Redis 연결 설정
 */
export const REDIS_CONFIG = {
  url: process.env[ENV_KEYS.REDIS_URL],
  host: process.env[ENV_KEYS.REDIS_HOST] || 'localhost',
  port: parseInt(process.env[ENV_KEYS.REDIS_PORT] || '6379'),
  username: process.env[ENV_KEYS.REDIS_USERNAME] || 'default',
  password: process.env[ENV_KEYS.REDIS_PASSWORD],
  db: parseInt(process.env[ENV_KEYS.REDIS_DB] || '0'),

  // 연결 옵션
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false, // 즉시 연결 시도

  // 커넥션 풀 설정
  family: 4, // IPv4
  keepAlive: 30000, // 30초 (milliseconds)

  // 타임아웃 설정
  connectTimeout: 10000, // 10초
  commandTimeout: 5000, // 5초

  // 재연결 및 오프라인 큐 설정
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: true, // 연결 실패시 명령 큐잉
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
};

/**
 * 테스트 환경 전용 Redis 설정
 */
export const TEST_REDIS_CONFIG = {
  url: process.env[ENV_KEYS.TEST_REDIS_URL] || process.env[ENV_KEYS.REDIS_URL],
  host:
    process.env[ENV_KEYS.TEST_REDIS_HOST] ||
    process.env[ENV_KEYS.REDIS_HOST] ||
    'localhost',
  port: parseInt(
    process.env[ENV_KEYS.TEST_REDIS_PORT] ||
      process.env[ENV_KEYS.REDIS_PORT] ||
      '6379',
  ),
  username:
    process.env[ENV_KEYS.TEST_REDIS_USERNAME] ||
    process.env[ENV_KEYS.REDIS_USERNAME] ||
    'default',
  password:
    process.env[ENV_KEYS.TEST_REDIS_PASSWORD] ||
    process.env[ENV_KEYS.REDIS_PASSWORD],
  db: parseInt(process.env[ENV_KEYS.TEST_REDIS_DB] || '1'), // 기본값을 DB 1로 설정 (테스트용)

  // 테스트 환경 최적화 설정
  retryDelayOnFailover: 50, // 더 빠른 재연결
  maxRetriesPerRequest: 1, // 재시도 최소화
  lazyConnect: false,

  // 커넥션 풀 설정 (테스트용 최적화)
  family: 4,
  keepAlive: 10000, // 10초 (더 짧게)

  // 타임아웃 설정 (테스트용 최적화)
  connectTimeout: 5000, // 5초
  commandTimeout: 2000, // 2초

  // 재연결 및 오프라인 큐 설정
  retryDelayOnClusterDown: 100,
  enableOfflineQueue: false, // 테스트에서는 큐잉 비활성화
  autoResubscribe: false,
  autoResendUnfulfilledCommands: false,
};

/**
 * Redis 환경변수 검증
 */
export const validateRedisConfig = () => {
  const logger = new Logger('RedisConfig');
  // 테스트 환경에서는 조용히 검증
  if (process.env.NODE_ENV === 'test') {
    return validateTestRedisConfig();
  }

  const redisUrl = process.env[ENV_KEYS.REDIS_URL];
  const redisHost = process.env[ENV_KEYS.REDIS_HOST];

  // Redis URL 또는 Host가 필요
  if (!redisUrl && !redisHost) {
    logger.error('Redis connection required:');
    logger.error(`   - Set ${ENV_KEYS.REDIS_URL} for connection string`);
    logger.error(
      `   - OR set ${ENV_KEYS.REDIS_HOST} for host-based connection`,
    );
    process.exit(1);
  }

  // Redis 포트 검증
  const port = parseInt(process.env[ENV_KEYS.REDIS_PORT] || '6379');
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(
      `${ENV_KEYS.REDIS_PORT} must be a valid port number (1-65535)`,
    );
    process.exit(1);
  }

  logger.log('Redis Configuration validated');
  logger.log(`   - Host: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
  logger.log(`   - Database: ${REDIS_CONFIG.db}`);
  logger.log(`   - Username: ${REDIS_CONFIG.username}`);
  logger.log(`   - Connection: ${redisUrl ? 'URL-based' : 'Host-based'}`);
};

/**
 * 테스트 환경용 Redis 환경변수 검증 (조용한 버전)
 */
export const validateTestRedisConfig = (): void => {
  // 테스트 환경에서는 검증만 하고 출력은 최소화
  const testRedisUrl = process.env[ENV_KEYS.TEST_REDIS_URL];
  const testRedisHost = process.env[ENV_KEYS.TEST_REDIS_HOST];
  const redisUrl = process.env[ENV_KEYS.REDIS_URL];
  const redisHost = process.env[ENV_KEYS.REDIS_HOST];

  // 테스트용 Redis 설정 또는 기본 Redis 설정 중 하나는 필요
  if (!testRedisUrl && !testRedisHost && !redisUrl && !redisHost) {
    throw new Error(
      'Missing test Redis environment variables: TEST_REDIS_URL/TEST_REDIS_HOST or REDIS_URL/REDIS_HOST required',
    );
  }

  // 포트 검증
  const testPort =
    process.env[ENV_KEYS.TEST_REDIS_PORT] ||
    process.env[ENV_KEYS.REDIS_PORT] ||
    '6379';
  const port = parseInt(testPort);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid Redis port: ${testPort}`);
  }
};
