import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserOnlineStatus1755100000000 implements MigrationInterface {
  name = 'RemoveUserOnlineStatus1755100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // status 컬럼 인덱스 제거
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_status"`);
    
    // status 컬럼 제거
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
    
    console.log('✅ User online status tracking removed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // status 컬럼 재생성
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='status') THEN
          ALTER TABLE "users" ADD COLUMN "status" VARCHAR NOT NULL DEFAULT 'offline';
        END IF;
      END $$;
    `);
    
    // status 컬럼 인덱스 재생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "users" ("status")
    `);
    
    console.log('⚠️ User online status tracking restored (rollback)');
  }
}