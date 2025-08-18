import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionTrackingFieldsToUser1755407164008
  implements MigrationInterface
{
  name = 'AddSessionTrackingFieldsToUser1755407164008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "bannedAt" TIMESTAMP`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedAt" IS '계정 정지 시간'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "bannedReason" character varying(500)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedReason" IS '계정 정지 사유'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "bannedBy" integer`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedBy" IS '계정을 정지시킨 관리자 ID'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "bannedUntil" TIMESTAMP`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedUntil" IS '계정 정지 해제 예정 시간'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastForcedLogout" TIMESTAMP`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."lastForcedLogout" IS '마지막 강제 로그아웃 시간'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "sessionVersion" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."sessionVersion" IS '세션 버전 (강제 로그아웃 시 증가)'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4840fed5ef9baa08c4c314503"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."messages_status_enum" RENAME TO "messages_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" TYPE "public"."messages_status_enum" USING "status"::"text"::"public"."messages_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'`,
    );
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_e4840fed5ef9baa08c4c314503" ON "messages" ("status", "createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4840fed5ef9baa08c4c314503"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_status_enum_old" AS ENUM('deleted', 'delivered', 'failed', 'read', 'sent')`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" TYPE "public"."messages_status_enum_old" USING "status"::"text"::"public"."messages_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'`,
    );
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."messages_status_enum_old" RENAME TO "messages_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4840fed5ef9baa08c4c314503" ON "messages" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."sessionVersion" IS '세션 버전 (강제 로그아웃 시 증가)'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionVersion"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."lastForcedLogout" IS '마지막 강제 로그아웃 시간'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lastForcedLogout"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedUntil" IS '계정 정지 해제 예정 시간'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bannedUntil"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedBy" IS '계정을 정지시킨 관리자 ID'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bannedBy"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedReason" IS '계정 정지 사유'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bannedReason"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."bannedAt" IS '계정 정지 시간'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bannedAt"`);
  }
}
