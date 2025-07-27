import { DataSource } from 'typeorm';
import { MIGRATION_CONFIG, validateDatabaseConfig } from './src/config/database.config';

// 환경변수 검증 및 로깅
validateDatabaseConfig();

export const AppDataSource = new DataSource(MIGRATION_CONFIG);