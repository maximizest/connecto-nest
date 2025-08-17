import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveFileUploadLegacyFields1755390148164 implements MigrationInterface {
    name = 'RemoveFileUploadLegacyFields1755390148164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "uploadId"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "totalChunks"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "completedChunks"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "uploadedBytes"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "progress"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "retryCount"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "lastChunkUploadedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77a304d841bf3286f8a730d319"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f8047436ae0058cbc312ce9e13"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_uploadtype_enum" RENAME TO "file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_uploadtype_enum" AS ENUM('direct')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "uploadType" TYPE "public"."file_uploads_uploadtype_enum" USING "uploadType"::"text"::"public"."file_uploads_uploadtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_status_enum" RENAME TO "file_uploads_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" TYPE "public"."file_uploads_status_enum" USING "status"::"text"::"public"."file_uploads_status_enum"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_f8047436ae0058cbc312ce9e13" ON "file_uploads" ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_77a304d841bf3286f8a730d319" ON "file_uploads" ("userId", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_77a304d841bf3286f8a730d319"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f8047436ae0058cbc312ce9e13"`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_status_enum_old" AS ENUM('cancelled', 'completed', 'failed', 'pending', 'processing', 'uploading')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" TYPE "public"."file_uploads_status_enum_old" USING "status"::"text"::"public"."file_uploads_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_status_enum_old" RENAME TO "file_uploads_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_uploadtype_enum_old" AS ENUM('direct', 'multipart', 'single')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "uploadType" TYPE "public"."file_uploads_uploadtype_enum_old" USING "uploadType"::"text"::"public"."file_uploads_uploadtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_uploadtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."file_uploads_uploadtype_enum_old" RENAME TO "file_uploads_uploadtype_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_f8047436ae0058cbc312ce9e13" ON "file_uploads" ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_77a304d841bf3286f8a730d319" ON "file_uploads" ("userId", "status") `);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "lastChunkUploadedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "retryCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "progress" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "uploadedBytes" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "completedChunks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "totalChunks" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "uploadId" character varying(100)`);
    }

}
