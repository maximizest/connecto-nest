import { User } from './src/modules/users/user.entity';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: process.env.DATABASE_TYPE as 'postgres' || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'database',
  entities: [User],
  migrations: ['./src/migrations/*.ts'],
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || false,
  logging: process.env.DATABASE_LOGGING === 'true' || false,
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' || false,
  } : false,
});