import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncAllEntityChanges1755180014105 implements MigrationInterface {
    name = 'SyncAllEntityChanges1755180014105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c75e77b20aed2d8633d83dc767"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b0e1a27f5119514e54547f02c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d5efa4db71a540f016110b32d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe9fad8d1971b7fded468011a2"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isOnline"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastSeenAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshTokenExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loginCount"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstLoginAt"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_uploadtype_enum" RENAME TO "file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_uploadtype_enum" AS ENUM('direct', 'single', 'multipart')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "uploadType" TYPE "public"."file_uploads_uploadtype_enum" USING "uploadType"::"text"::"public"."file_uploads_uploadtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."uploadId" IS '업로드 ID (레거시 멀티파트용)'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."totalChunks" IS '전체 청크 수 (레거시)'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."completedChunks" IS '완료된 청크 수 (레거시)'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."uploadedBytes" IS '업로드된 바이트 수 (레거시)'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."uploadedBytes" IS '업로드된 바이트 수'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."completedChunks" IS '완료된 청크 수'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."totalChunks" IS '전체 청크 수'`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."uploadId" IS '업로드 ID (멀티파트)'`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_uploadtype_enum_old" AS ENUM('single', 'multipart')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "uploadType" TYPE "public"."file_uploads_uploadtype_enum_old" USING "uploadType"::"text"::"public"."file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_uploadtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_uploadtype_enum_old" RENAME TO "file_uploads_uploadtype_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "firstLoginAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "loginCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshTokenExpiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastSeenAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isOnline" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" text`);
        await queryRunner.query(`CREATE INDEX "IDX_fe9fad8d1971b7fded468011a2" ON "users" ("provider", "isOnline") `);
        await queryRunner.query(`CREATE INDEX "IDX_0d5efa4db71a540f016110b32d" ON "users" ("isOnline", "lastSeenAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_b0e1a27f5119514e54547f02c8" ON "users" ("lastSeenAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_c75e77b20aed2d8633d83dc767" ON "users" ("isOnline") `);
    }

}
