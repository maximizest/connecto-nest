import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageFullTextSearch1704000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 한국어 지원이 필요한 경우 (pg_trgm extension 필요)
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `);

    // PostgreSQL 전문 검색 인덱스 생성 (CONCURRENTLY 제거 - 트랜잭션 내에서 실행 불가)
    // GIN (Generalized Inverted Index)를 사용하여 효율적인 텍스트 검색 지원
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_content_fts
      ON messages USING GIN (to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE("searchableText", '')))
    `);

    // 한국어 포함 다국어 검색을 위한 trigram 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
      ON messages USING GIN ((COALESCE(content, '') || ' ' || COALESCE("searchableText", '')) gin_trgm_ops)
    `);

    // 검색 성능 향상을 위한 복합 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_planet_created
      ON messages ("planetId", "createdAt" DESC)
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_content_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_content_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_planet_created`);
  }
}