import * as dotenv from 'dotenv';
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
 * Redis 환경변수 검증
 */
export const validateRedisConfig = () => {
  // 테스트 환경에서는 조용히 검증
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const redisUrl = process.env[ENV_KEYS.REDIS_URL];
  const redisHost = process.env[ENV_KEYS.REDIS_HOST];

  // Redis URL 또는 Host가 필요
  if (!redisUrl && !redisHost) {
    console.error('❌ Redis connection required:');
    console.error(`   - Set ${ENV_KEYS.REDIS_URL} for connection string`);
    console.error(
      `   - OR set ${ENV_KEYS.REDIS_HOST} for host-based connection`,
    );
    process.exit(1);
  }

  // Redis 포트 검증
  const port = parseInt(process.env[ENV_KEYS.REDIS_PORT] || '6379');
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(
      `❌ ${ENV_KEYS.REDIS_PORT} must be a valid port number (1-65535)`,
    );
    process.exit(1);
  }

  console.log('✅ Redis Configuration validated');
  console.log(`   - Host: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port}`);
  console.log(`   - Database: ${REDIS_CONFIG.db}`);
  console.log(`   - Username: ${REDIS_CONFIG.username}`);
  console.log(`   - Connection: ${redisUrl ? 'URL-based' : 'Host-based'}`);
};
