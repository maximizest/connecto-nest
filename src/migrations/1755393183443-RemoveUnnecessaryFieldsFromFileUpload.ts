import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUnnecessaryFieldsFromFileUpload1755393183443 implements MigrationInterface {
    name = 'RemoveUnnecessaryFieldsFromFileUpload1755393183443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9dc087b883828f932fe0fb4b4a"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "errorMessage"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "startedAt"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "isFromDeletedUser"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "thumbnailUrl"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "cloudflareMediaId"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "mediaStorage"`);
        await queryRunner.query(`DROP TYPE "public"."file_uploads_mediastorage_enum"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "mediaVariants"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "mediaVariants" json`);
        await queryRunner.query(`CREATE TYPE "public"."file_uploads_mediastorage_enum" AS ENUM('images', 'r2', 'stream')`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "mediaStorage" "public"."file_uploads_mediastorage_enum" NOT NULL DEFAULT 'r2'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "cloudflareMediaId" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "thumbnailUrl" text`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "isFromDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "completedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "startedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "errorMessage" text`);
        await queryRunner.query(`CREATE INDEX "IDX_9dc087b883828f932fe0fb4b4a" ON "file_uploads" ("isFromDeletedUser") `);
    }

}
