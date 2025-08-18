import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissionTables1755560046146 implements MigrationInterface {
  name = 'CreateMissionTables1755560046146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."missions_type_enum" AS ENUM('IMAGE', 'VIDEO', 'BALANCE_GAME')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."missions_target_enum" AS ENUM('INDIVIDUAL', 'GROUP')`,
    );
    await queryRunner.query(
      `CREATE TABLE "missions" ("id" SERIAL NOT NULL, "type" "public"."missions_type_enum" NOT NULL, "target" "public"."missions_target_enum" NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL, "metadata" jsonb, "startAt" TIMESTAMP NOT NULL, "endAt" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "maxSubmissions" integer, "allowResubmission" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_787aebb1ac5923c9904043c6309" PRIMARY KEY ("id")); COMMENT ON COLUMN "missions"."type" IS '미션 타입 (이미지, 비디오, 밸런스 게임)'; COMMENT ON COLUMN "missions"."target" IS '미션 대상 (개인/단체)'; COMMENT ON COLUMN "missions"."title" IS '미션 제목'; COMMENT ON COLUMN "missions"."description" IS '미션 설명'; COMMENT ON COLUMN "missions"."metadata" IS '미션 타입별 추가 데이터'; COMMENT ON COLUMN "missions"."startAt" IS '미션 시작 시간'; COMMENT ON COLUMN "missions"."endAt" IS '미션 종료 시간'; COMMENT ON COLUMN "missions"."isActive" IS '미션 활성화 여부'; COMMENT ON COLUMN "missions"."maxSubmissions" IS '최대 제출 횟수 (null = 무제한)'; COMMENT ON COLUMN "missions"."allowResubmission" IS '반복 제출 가능 여부'; COMMENT ON COLUMN "missions"."createdAt" IS '미션 생성 시간'; COMMENT ON COLUMN "missions"."updatedAt" IS '미션 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_996d33236a2a8bfb1a1cfd0b61" ON "missions" ("startAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10e095e339aaef05817e4c5723" ON "missions" ("endAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec564e1f850db06bae08eb08f9" ON "missions" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc7ab424015ec9c23270961b24" ON "missions" ("startAt", "endAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4ff99a25e6824d32db5180675" ON "missions" ("type", "target") `,
    );
    await queryRunner.query(
      `CREATE TABLE "mission_travels" ("id" SERIAL NOT NULL, "missionId" integer NOT NULL, "travelId" integer NOT NULL, "planetId" integer, "assignedBy" integer, "isActive" boolean NOT NULL DEFAULT true, "submissionCount" integer NOT NULL DEFAULT '0', "assignedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_24db534aaa5ce549a9b5898eaf6" UNIQUE ("missionId", "travelId"), CONSTRAINT "PK_8ecc0ee6f4020a4814a6a88b767" PRIMARY KEY ("id")); COMMENT ON COLUMN "mission_travels"."missionId" IS '미션 ID'; COMMENT ON COLUMN "mission_travels"."travelId" IS '여행 ID'; COMMENT ON COLUMN "mission_travels"."planetId" IS '미션이 전송될 행성(채팅방) ID'; COMMENT ON COLUMN "mission_travels"."assignedBy" IS '미션을 할당한 관리자/호스트 ID'; COMMENT ON COLUMN "mission_travels"."isActive" IS '미션 활성화 여부'; COMMENT ON COLUMN "mission_travels"."submissionCount" IS '현재 제출 횟수'; COMMENT ON COLUMN "mission_travels"."assignedAt" IS '미션 할당 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32abddddeaaf8f0d9a34c256ae" ON "mission_travels" ("missionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b4b668b55cabdae2f04a7c06a" ON "mission_travels" ("travelId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mission_submissions_submissiontype_enum" AS ENUM('IMAGE', 'VIDEO', 'BALANCE_GAME')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."mission_submissions_status_enum" AS ENUM('PENDING', 'COMPLETED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "mission_submissions" ("id" SERIAL NOT NULL, "missionId" integer NOT NULL, "userId" integer NOT NULL, "travelId" integer NOT NULL, "submissionType" "public"."mission_submissions_submissiontype_enum" NOT NULL, "content" jsonb NOT NULL, "status" "public"."mission_submissions_status_enum" NOT NULL DEFAULT 'PENDING', "reviewedBy" integer, "reviewedAt" TIMESTAMP, "reviewComment" text, "messageId" integer, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1116c2cb367fd28783f31217311" PRIMARY KEY ("id")); COMMENT ON COLUMN "mission_submissions"."missionId" IS '미션 ID'; COMMENT ON COLUMN "mission_submissions"."userId" IS '제출한 사용자 ID'; COMMENT ON COLUMN "mission_submissions"."travelId" IS '여행 ID'; COMMENT ON COLUMN "mission_submissions"."submissionType" IS '제출 타입'; COMMENT ON COLUMN "mission_submissions"."content" IS '제출 데이터'; COMMENT ON COLUMN "mission_submissions"."status" IS '제출 상태'; COMMENT ON COLUMN "mission_submissions"."reviewedBy" IS '평가한 관리자/호스트 ID'; COMMENT ON COLUMN "mission_submissions"."reviewedAt" IS '평가 시간'; COMMENT ON COLUMN "mission_submissions"."reviewComment" IS '평가 코멘트'; COMMENT ON COLUMN "mission_submissions"."messageId" IS '연결된 메시지 ID (채팅방에 전송된 메시지)'; COMMENT ON COLUMN "mission_submissions"."submittedAt" IS '제출 시간'; COMMENT ON COLUMN "mission_submissions"."updatedAt" IS '수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccd9d7b505ab99528ca2738a95" ON "mission_submissions" ("submittedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7aac1f5ee24eb19c23d11e7e08" ON "mission_submissions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82318648ec75eec946b5cbb31b" ON "mission_submissions" ("travelId", "missionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb92ac0d3b95b36053c6c5ed83" ON "mission_submissions" ("userId", "missionId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" ADD CONSTRAINT "FK_32abddddeaaf8f0d9a34c256ae4" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" ADD CONSTRAINT "FK_8b4b668b55cabdae2f04a7c06ae" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" ADD CONSTRAINT "FK_49e46a6aa2fb7239c4c1d850125" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" ADD CONSTRAINT "FK_797754dd0c15d19be3531de5536" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" ADD CONSTRAINT "FK_4301030d759f1e0fab3c619d32c" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" ADD CONSTRAINT "FK_d2e4528f325f7c21db7117410d8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" ADD CONSTRAINT "FK_ed15af6015c5e0e9f460e2a567c" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" ADD CONSTRAINT "FK_27a9b763f64200d6afb6c59bde9" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" ADD CONSTRAINT "FK_f74a6021220e22aa5ae9f0efc5d" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" DROP CONSTRAINT "FK_f74a6021220e22aa5ae9f0efc5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" DROP CONSTRAINT "FK_27a9b763f64200d6afb6c59bde9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" DROP CONSTRAINT "FK_ed15af6015c5e0e9f460e2a567c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" DROP CONSTRAINT "FK_d2e4528f325f7c21db7117410d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_submissions" DROP CONSTRAINT "FK_4301030d759f1e0fab3c619d32c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" DROP CONSTRAINT "FK_797754dd0c15d19be3531de5536"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" DROP CONSTRAINT "FK_49e46a6aa2fb7239c4c1d850125"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" DROP CONSTRAINT "FK_8b4b668b55cabdae2f04a7c06ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mission_travels" DROP CONSTRAINT "FK_32abddddeaaf8f0d9a34c256ae4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb92ac0d3b95b36053c6c5ed83"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82318648ec75eec946b5cbb31b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7aac1f5ee24eb19c23d11e7e08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccd9d7b505ab99528ca2738a95"`,
    );
    await queryRunner.query(`DROP TABLE "mission_submissions"`);
    await queryRunner.query(
      `DROP TYPE "public"."mission_submissions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."mission_submissions_submissiontype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b4b668b55cabdae2f04a7c06a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_32abddddeaaf8f0d9a34c256ae"`,
    );
    await queryRunner.query(`DROP TABLE "mission_travels"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4ff99a25e6824d32db5180675"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc7ab424015ec9c23270961b24"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec564e1f850db06bae08eb08f9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10e095e339aaef05817e4c5723"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_996d33236a2a8bfb1a1cfd0b61"`,
    );
    await queryRunner.query(`DROP TABLE "missions"`);
    await queryRunner.query(`DROP TYPE "public"."missions_target_enum"`);
    await queryRunner.query(`DROP TYPE "public"."missions_type_enum"`);
  }
}
