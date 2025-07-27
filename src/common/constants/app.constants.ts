/**
 * 보안 관련 상수
 */
export const SECURITY_CONSTANTS = {
  BCRYPT_SALT_ROUNDS: 10,
  JWT_MIN_SECRET_LENGTH: 32,
  DEFAULT_JWT_ACCESS_EXPIRES: '15m',
  DEFAULT_JWT_REFRESH_EXPIRES: '7d',
} as const;

/**
 * 데이터베이스 관련 상수
 */
export const DATABASE_CONSTANTS = {
  DEFAULT_PORT: 5432,
  DEFAULT_MAX_CONNECTIONS: 20,
  DEFAULT_MIN_CONNECTIONS: 5,
  DEFAULT_CONNECTION_TIMEOUT: 30000,
  QUERY_EXECUTION_TIME_WARNING: 3000, // 3초
  CACHE_DURATION: 30000, // 30초
} as const;

/**
 * HTTP 관련 상수
 */
export const HTTP_CONSTANTS = {
  DEFAULT_PORT: 3000,
  DEFAULT_API_VERSION: '1',
  DEFAULT_API_PREFIX: 'api/v',
} as const;

/**
 * 에러 메시지 상수
 */
export const ERROR_MESSAGES = {
  // 인증 관련
  EMAIL_EXISTS: '이미 존재하는 이메일입니다.',
  EMAIL_NOT_FOUND: '존재하지 않는 이메일입니다.',
  PASSWORD_MISMATCH: '비밀번호가 일치하지 않습니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  INVALID_REFRESH_TOKEN: '유효하지 않은 리프레시 토큰입니다.',
  SOCIAL_LOGIN_ACCOUNT: '소셜 로그인 계정입니다. 소셜 로그인을 이용해주세요.',

  // 토큰 관련
  TOKEN_NOT_PROVIDED: '토큰이 제공되지 않았습니다.',
  TOKEN_EXPIRED: '토큰이 만료되었습니다.',
  TOKEN_INVALID: '유효하지 않은 토큰입니다.',
  TOKEN_NOT_ACTIVE: '토큰이 아직 활성화되지 않았습니다.',
  TOKEN_VERIFICATION_FAILED: '토큰 검증에 실패했습니다.',
  TOKEN_GENERATION_FAILED: '토큰 생성에 실패했습니다.',
  BEARER_TOKEN_REQUIRED: 'Bearer 토큰이 필요합니다.',
  TOKEN_EMPTY: '토큰이 비어있습니다.',
  AUTH_HEADER_REQUIRED: 'Authorization 헤더가 필요합니다.',

  // 일반적인 에러
  DATABASE_ERROR: '데이터베이스 오류가 발생했습니다.',
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
  VALIDATION_ERROR: '입력 데이터 검증에 실패했습니다.',

  // 로그아웃
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
  LOGOUT_ERROR: '로그아웃 처리 중 오류가 발생했습니다.',
} as const;

/**
 * 성공 메시지 상수
 */
export const SUCCESS_MESSAGES = {
  USER_REGISTERED: '회원가입이 완료되었습니다.',
  USER_SIGNED_IN: '로그인이 완료되었습니다.',
  TOKEN_REFRESHED: '토큰이 갱신되었습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
} as const;

/**
 * 로그 관련 상수
 */
export const LOG_CONSTANTS = {
  REQUEST_ID_LENGTH: 30,
  MAX_LOG_DATA_SIZE: 10000, // 10KB
  LOG_LEVELS: ['log', 'error', 'warn', 'debug', 'verbose'] as const,
} as const;

/**
 * 환경변수 키 상수
 */
export const ENV_KEYS = {
  // 서버
  PORT: 'PORT',
  NODE_ENV: 'NODE_ENV',

  // API
  API_VERSION: 'API_VERSION',
  API_PREFIX: 'API_PREFIX',

  // JWT
  JWT_SECRET: 'JWT_SECRET',
  JWT_ACCESS_TOKEN_EXPIRES_IN: 'JWT_ACCESS_TOKEN_EXPIRES_IN',
  JWT_REFRESH_TOKEN_EXPIRES_IN: 'JWT_REFRESH_TOKEN_EXPIRES_IN',

  // 데이터베이스
  DATABASE_TYPE: 'DATABASE_TYPE',
  DATABASE_HOST: 'DATABASE_HOST',
  DATABASE_PORT: 'DATABASE_PORT',
  DATABASE_USERNAME: 'DATABASE_USERNAME',
  DATABASE_PASSWORD: 'DATABASE_PASSWORD',
  DATABASE_NAME: 'DATABASE_NAME',
  DATABASE_SYNCHRONIZE: 'DATABASE_SYNCHRONIZE',
  DATABASE_LOGGING: 'DATABASE_LOGGING',
  DATABASE_SSL: 'DATABASE_SSL',
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_MAX_CONNECTIONS: 'DATABASE_MAX_CONNECTIONS',
  DATABASE_MIN_CONNECTIONS: 'DATABASE_MIN_CONNECTIONS',
  DATABASE_CONNECTION_TIMEOUT: 'DATABASE_CONNECTION_TIMEOUT',

  // 프론트엔드
  FRONTEND_URL: 'FRONTEND_URL',

  // 로그
  LOG_LEVEL: 'LOG_LEVEL',
} as const; 