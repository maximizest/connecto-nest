/**
 * JWT 설정 (중앙 관리)
 */
export const JWT_CONFIG = {
  global: true,
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  },
};

/**
 * JWT 환경변수 검증
 */
export const validateJwtConfig = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    console.warn('⚠️  JWT_SECRET is using default value. Please set a secure secret in production!');
  }
  console.log(`🔐 JWT Token expires in: ${JWT_CONFIG.signOptions.expiresIn}`);
}; 