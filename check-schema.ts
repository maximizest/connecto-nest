import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSchemaDiff() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    
    // 스키마 차이 확인
    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();
    
    if (sqlInMemory.upQueries.length === 0) {
      console.log('✅ 엔티티와 데이터베이스 스키마가 완전히 일치합니다!');
    } else {
      console.log('⚠️ 다음 변경사항이 데이터베이스에 반영되지 않았습니다:');
      console.log('=' .repeat(60));
      
      sqlInMemory.upQueries.forEach((query, index) => {
        console.log(`\n[${index + 1}] ${query.query}`);
        if (query.parameters?.length) {
          console.log('   Parameters:', query.parameters);
        }
      });
      
      console.log('\n' + '=' .repeat(60));
      console.log(`총 ${sqlInMemory.upQueries.length}개의 변경사항이 있습니다.`);
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchemaDiff();