import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveVideoProcessingAndAddCloudflareMedia1755391797638
  implements MigrationInterface
{
  name = 'RemoveVideoProcessingAndAddCloudflareMedia1755391797638';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD "thumbnailUrl" text`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."thumbnailUrl" IS '썸네일 URL (이미지/비디오)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD "cloudflareMediaId" character varying(100)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."cloudflareMediaId" IS 'Cloudflare Media ID (Stream UID 또는 Images ID)'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_uploads_mediastorage_enum" AS ENUM('r2', 'stream', 'images')`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD "mediaStorage" "public"."file_uploads_mediastorage_enum" NOT NULL DEFAULT 'r2'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."mediaStorage" IS '미디어 저장 위치'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD "mediaVariants" json`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."mediaVariants" IS '미디어 변형 URLs (이미지 variants, 비디오 스트리밍 URLs)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."mediaVariants" IS '미디어 변형 URLs (이미지 variants, 비디오 스트리밍 URLs)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP COLUMN "mediaVariants"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."mediaStorage" IS '미디어 저장 위치'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP COLUMN "mediaStorage"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."file_uploads_mediastorage_enum"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."cloudflareMediaId" IS 'Cloudflare Media ID (Stream UID 또는 Images ID)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP COLUMN "cloudflareMediaId"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "file_uploads"."thumbnailUrl" IS '썸네일 URL (이미지/비디오)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP COLUMN "thumbnailUrl"`,
    );
  }
}
