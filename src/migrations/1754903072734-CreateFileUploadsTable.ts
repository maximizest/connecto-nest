import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFileUploadsTable1754903072734 implements MigrationInterface {
  name = 'CreateFileUploadsTable1754903072734';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."file_uploads_uploadtype_enum" AS ENUM('single', 'multipart')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_uploads_status_enum" AS ENUM('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "file_uploads" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "originalFileName" character varying(255) NOT NULL, "storageKey" character varying(500) NOT NULL, "mimeType" character varying(100) NOT NULL, "fileSize" bigint NOT NULL, "uploadType" "public"."file_uploads_uploadtype_enum" NOT NULL, "status" "public"."file_uploads_status_enum" NOT NULL DEFAULT 'pending', "uploadId" character varying(100), "totalChunks" integer NOT NULL DEFAULT '0', "completedChunks" integer NOT NULL DEFAULT '0', "uploadedBytes" bigint NOT NULL DEFAULT '0', "progress" integer NOT NULL DEFAULT '0', "folder" character varying(50), "publicUrl" text, "metadata" json, "errorMessage" text, "retryCount" integer NOT NULL DEFAULT '0', "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, "lastChunkUploadedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, CONSTRAINT "PK_b3ebfc99a8b660f0bc64a052b42" PRIMARY KEY ("id")); COMMENT ON COLUMN "file_uploads"."userId" IS '업로드한 사용자 ID'; COMMENT ON COLUMN "file_uploads"."originalFileName" IS '원본 파일명'; COMMENT ON COLUMN "file_uploads"."storageKey" IS '스토리지 키 (경로)'; COMMENT ON COLUMN "file_uploads"."mimeType" IS '파일 MIME 타입'; COMMENT ON COLUMN "file_uploads"."fileSize" IS '파일 크기 (bytes)'; COMMENT ON COLUMN "file_uploads"."uploadType" IS '업로드 타입'; COMMENT ON COLUMN "file_uploads"."status" IS '업로드 상태'; COMMENT ON COLUMN "file_uploads"."uploadId" IS '업로드 ID (멀티파트)'; COMMENT ON COLUMN "file_uploads"."totalChunks" IS '전체 청크 수'; COMMENT ON COLUMN "file_uploads"."completedChunks" IS '완료된 청크 수'; COMMENT ON COLUMN "file_uploads"."uploadedBytes" IS '업로드된 바이트 수'; COMMENT ON COLUMN "file_uploads"."progress" IS '진행률 (0-100)'; COMMENT ON COLUMN "file_uploads"."folder" IS '업로드 폴더'; COMMENT ON COLUMN "file_uploads"."publicUrl" IS '파일 공개 URL'; COMMENT ON COLUMN "file_uploads"."metadata" IS '추가 메타데이터'; COMMENT ON COLUMN "file_uploads"."errorMessage" IS '실패 사유'; COMMENT ON COLUMN "file_uploads"."retryCount" IS '재시도 횟수'; COMMENT ON COLUMN "file_uploads"."startedAt" IS '업로드 시작 시간'; COMMENT ON COLUMN "file_uploads"."completedAt" IS '업로드 완료 시간'; COMMENT ON COLUMN "file_uploads"."lastChunkUploadedAt" IS '마지막 청크 업로드 시간'; COMMENT ON COLUMN "file_uploads"."createdAt" IS '생성 시간'; COMMENT ON COLUMN "file_uploads"."updatedAt" IS '수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94ebfb8561e9ec5a73f4825303" ON "file_uploads" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b9c79f1f9c829564bc687f967" ON "file_uploads" ("storageKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_708122a96c2c29befcb55304b2" ON "file_uploads" ("uploadType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5092ff1043be76e3f343af4586" ON "file_uploads" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20f0c90a9578b335c737f478a0" ON "file_uploads" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8047436ae0058cbc312ce9e13" ON "file_uploads" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77a304d841bf3286f8a730d319" ON "file_uploads" ("userId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD CONSTRAINT "FK_e98a66989ce33c0f7343bc502dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP CONSTRAINT "FK_e98a66989ce33c0f7343bc502dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94ebfb8561e9ec5a73f4825303"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5092ff1043be76e3f343af4586"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_708122a96c2c29befcb55304b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20f0c90a9578b335c737f478a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_77a304d841bf3286f8a730d319"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8047436ae0058cbc312ce9e13"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20f0c90a9578b335c737f478a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5092ff1043be76e3f343af4586"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_708122a96c2c29befcb55304b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b9c79f1f9c829564bc687f967"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94ebfb8561e9ec5a73f4825303"`,
    );
    await queryRunner.query(`DROP TABLE "file_uploads"`);
    await queryRunner.query(`DROP TYPE "public"."file_uploads_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."file_uploads_uploadtype_enum"`,
    );
  }
}
