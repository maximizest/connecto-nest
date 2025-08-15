import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteConfiguration1755221500000
  implements MigrationInterface
{
  name = 'SoftDeleteConfiguration1755221500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove old isDeleted column and related indexes from messages table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_5f84c237b7406e33771839742c"`,
    ); // isDeleted index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_706eed08cb5e027fe5e9fcb9a0"`,
    ); // planetId, isDeleted, createdAt index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2b6f42dcafbc76eb6f4f8bc5c5"`,
    ); // planetId, isDeleted index
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "isDeleted"`,
    );

    // Add soft delete columns to users table
    await queryRunner.query(`ALTER TABLE "users" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."deletedAt" IS '계정 삭제 시간 (Soft Delete)'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "deletedBy" integer`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."deletedBy" IS '삭제한 사용자 ID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deletionReason" character varying(255)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."deletionReason" IS '삭제 사유'`,
    );

    // Add soft delete columns to messages table if not exists
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deletionReason" character varying(255)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "messages"."deletionReason" IS '삭제 사유'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "messages"."deletedAt" IS '메시지 삭제 시간 (Soft Delete)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "messages"."deletedBy" IS '삭제한 사용자 ID'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore isDeleted column and indexes
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "isDeleted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "messages"."isDeleted" IS '삭제 여부 (소프트 삭제)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f84c237b7406e33771839742c" ON "messages" ("isDeleted") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_706eed08cb5e027fe5e9fcb9a0" ON "messages" ("planetId", "isDeleted", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b6f42dcafbc76eb6f4f8bc5c5" ON "messages" ("planetId", "isDeleted") `,
    );

    // Remove soft delete columns from messages
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "deletionReason"`,
    );

    // Remove soft delete columns from users
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deletionReason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deletedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deletedAt"`,
    );
  }
}
