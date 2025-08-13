import * as dotenv from 'dotenv';
import {
  SECURITY_CONSTANTS,
  ENV_KEYS,
} from '../common/constants/app.constants';

// 환경변수 로드
dotenv.config();

/**
 * JWT 설정
 */
export const JWT_CONFIG = {
  secret: process.env[ENV_KEYS.JWT_SECRET],
  signOptions: {
    expiresIn:
      process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] ||
      SECURITY_CONSTANTS.DEFAULT_JWT_ACCESS_EXPIRES,
  },
};

/**
 * JWT 환경변수 검증
 */
export const validateJwtConfig = () => {
  const jwtSecret = process.env[ENV_KEYS.JWT_SECRET];

  // JWT_SECRET 필수 체크
  if (!jwtSecret) {
    console.error(`❌ ${ENV_KEYS.JWT_SECRET} is required but not provided`);
    console.error(`   Please set ${ENV_KEYS.JWT_SECRET} environment variable`);
    console.error(
      `   Example: ${ENV_KEYS.JWT_SECRET}=your-very-strong-jwt-secret-key-min-32-characters`,
    );
    process.exit(1);
  }

  // JWT_SECRET 길이 체크
  if (jwtSecret.length < SECURITY_CONSTANTS.JWT_MIN_SECRET_LENGTH) {
    console.error(
      `❌ ${ENV_KEYS.JWT_SECRET} must be at least ${SECURITY_CONSTANTS.JWT_MIN_SECRET_LENGTH} characters long`,
    );
    console.error(`   Current length: ${jwtSecret.length}`);
    console.error('   Please use a stronger JWT secret');
    process.exit(1);
  }

  // 개발 환경에서 기본값 사용 시 경고
  if (jwtSecret === 'your-very-strong-jwt-secret-key-min-32-characters') {
    console.warn(
      `⚠️  WARNING: You are using the default ${ENV_KEYS.JWT_SECRET}`,
    );
    console.warn(
      '   Please change it to a unique, strong secret in production',
    );
  }

  console.log('✅ JWT Configuration validated');
  console.log(`   - Secret length: ${jwtSecret.length} characters`);
  console.log(
    `   - Access token expires in: ${process.env[ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN] || SECURITY_CONSTANTS.DEFAULT_JWT_ACCESS_EXPIRES}`,
  );
  console.log(
    `   - Refresh token expires in: ${process.env[ENV_KEYS.JWT_REFRESH_TOKEN_EXPIRES_IN] || SECURITY_CONSTANTS.DEFAULT_JWT_REFRESH_EXPIRES}`,
  );
};
