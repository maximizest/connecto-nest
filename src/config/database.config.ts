import * as dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import { User } from '../modules/users/user.entity';
import { Post } from '../modules/posts/post.entity';

// 환경변수 로드
dotenv.config();

/**
 * 모든 엔티티 목록 (중앙 관리)
 */
export const ENTITIES = [User, Post];

/**
 * 공통 데이터베이스 설정
 */
export const DATABASE_CONFIG: DataSourceOptions = {
  type: (process.env.DATABASE_TYPE as 'postgres') || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'database',
  entities: ENTITIES,
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || false,
  logging: process.env.DATABASE_LOGGING === 'true' || false,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' || false,
  } : false,
};

/**
 * 마이그레이션용 설정 (migrations 경로 추가)
 */
export const MIGRATION_CONFIG: DataSourceOptions = {
  ...DATABASE_CONFIG,
  migrations: ['./src/migrations/*.ts'],
};

/**
 * 환경변수 검증
 */
export const validateDatabaseConfig = () => {
  const requiredEnvVars = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('   Using default values...');
  }

  console.log(`🔗 Database: ${DATABASE_CONFIG.host}:${DATABASE_CONFIG.port}/${DATABASE_CONFIG.database}`);
}; 