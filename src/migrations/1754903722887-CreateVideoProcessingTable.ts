import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVideoProcessingTable1754903722887
  implements MigrationInterface
{
  name = 'CreateVideoProcessingTable1754903722887';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."video_processing_processingtype_enum" AS ENUM('compression', 'thumbnail', 'metadata', 'preview', 'full_processing')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."video_processing_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."video_processing_qualityprofile_enum" AS ENUM('low', 'medium', 'high', 'ultra')`,
    );
    await queryRunner.query(
      `CREATE TABLE "video_processing" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "fileUploadId" integer, "processingType" "public"."video_processing_processingtype_enum" NOT NULL, "status" "public"."video_processing_status_enum" NOT NULL DEFAULT 'pending', "qualityProfile" "public"."video_processing_qualityprofile_enum", "inputStorageKey" character varying(500) NOT NULL, "originalFileName" character varying(255) NOT NULL, "inputFileSize" bigint NOT NULL, "inputMimeType" character varying(100) NOT NULL, "outputStorageKeys" text, "outputTotalSize" bigint, "outputUrls" text, "progress" integer NOT NULL DEFAULT '0', "estimatedDurationSeconds" integer, "actualDurationSeconds" integer, "inputMetadata" json, "outputMetadata" json, "thumbnails" json, "errorMessage" text, "processingLogs" json, "retryCount" integer NOT NULL DEFAULT '0', "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, "file_upload_id" integer, CONSTRAINT "PK_a6fbdbb2e7956d3681ec6c854ab" PRIMARY KEY ("id")); COMMENT ON COLUMN "video_processing"."userId" IS '요청한 사용자 ID'; COMMENT ON COLUMN "video_processing"."fileUploadId" IS '원본 파일 업로드 ID'; COMMENT ON COLUMN "video_processing"."processingType" IS '프로세싱 타입'; COMMENT ON COLUMN "video_processing"."status" IS '프로세싱 상태'; COMMENT ON COLUMN "video_processing"."qualityProfile" IS '품질 프로필'; COMMENT ON COLUMN "video_processing"."inputStorageKey" IS '원본 파일 스토리지 키'; COMMENT ON COLUMN "video_processing"."originalFileName" IS '원본 파일명'; COMMENT ON COLUMN "video_processing"."inputFileSize" IS '원본 파일 크기 (bytes)'; COMMENT ON COLUMN "video_processing"."inputMimeType" IS '원본 MIME 타입'; COMMENT ON COLUMN "video_processing"."outputStorageKeys" IS '처리된 파일 키들 (JSON)'; COMMENT ON COLUMN "video_processing"."outputTotalSize" IS '출력 파일들 총 크기 (bytes)'; COMMENT ON COLUMN "video_processing"."outputUrls" IS '출력 파일 공개 URLs (JSON)'; COMMENT ON COLUMN "video_processing"."progress" IS '진행률 (0-100)'; COMMENT ON COLUMN "video_processing"."estimatedDurationSeconds" IS '예상 소요 시간 (초)'; COMMENT ON COLUMN "video_processing"."actualDurationSeconds" IS '실제 소요 시간 (초)'; COMMENT ON COLUMN "video_processing"."inputMetadata" IS '입력 파일 메타데이터'; COMMENT ON COLUMN "video_processing"."outputMetadata" IS '출력 파일 메타데이터'; COMMENT ON COLUMN "video_processing"."thumbnails" IS '썸네일 정보'; COMMENT ON COLUMN "video_processing"."errorMessage" IS '에러 메시지'; COMMENT ON COLUMN "video_processing"."processingLogs" IS 'FFmpeg 로그'; COMMENT ON COLUMN "video_processing"."retryCount" IS '재시도 횟수'; COMMENT ON COLUMN "video_processing"."startedAt" IS '프로세싱 시작 시간'; COMMENT ON COLUMN "video_processing"."completedAt" IS '프로세싱 완료 시간'; COMMENT ON COLUMN "video_processing"."createdAt" IS '생성 시간'; COMMENT ON COLUMN "video_processing"."updatedAt" IS '수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e03225f2852506b1be1060154" ON "video_processing" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_678139a05090095bbdbde74aa7" ON "video_processing" ("processingType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9bbc19cb5b2dc194a8f7cd777" ON "video_processing" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_657d1c24ce108df7724bbde9fa" ON "video_processing" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5075ec013dfa8440475af765a9" ON "video_processing" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5389e29600e818b9dc863b04fa" ON "video_processing" ("userId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "video_processing" ADD CONSTRAINT "FK_8154aa1e73e0988bc810f0fe132" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_processing" ADD CONSTRAINT "FK_122e16caa78101d02e0f75e0dd9" FOREIGN KEY ("file_upload_id") REFERENCES "file_uploads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "video_processing" DROP CONSTRAINT "FK_122e16caa78101d02e0f75e0dd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_processing" DROP CONSTRAINT "FK_8154aa1e73e0988bc810f0fe132"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e03225f2852506b1be1060154"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9bbc19cb5b2dc194a8f7cd777"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_678139a05090095bbdbde74aa7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_657d1c24ce108df7724bbde9fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5389e29600e818b9dc863b04fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5075ec013dfa8440475af765a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_657d1c24ce108df7724bbde9fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9bbc19cb5b2dc194a8f7cd777"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_678139a05090095bbdbde74aa7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e03225f2852506b1be1060154"`,
    );
    await queryRunner.query(`DROP TABLE "video_processing"`);
    await queryRunner.query(
      `DROP TYPE "public"."video_processing_qualityprofile_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."video_processing_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."video_processing_processingtype_enum"`,
    );
  }
}
