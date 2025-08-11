import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStreamingSessionsTable1754904564775
  implements MigrationInterface
{
  name = 'CreateStreamingSessionsTable1754904564775';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."streaming_sessions_status_enum" AS ENUM('active', 'paused', 'ended', 'error')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."streaming_sessions_devicetype_enum" AS ENUM('mobile', 'tablet', 'desktop', 'tv', 'unknown')`,
    );
    await queryRunner.query(
      `CREATE TABLE "streaming_sessions" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "sessionId" character varying(100) NOT NULL, "storageKey" character varying(500) NOT NULL, "status" "public"."streaming_sessions_status_enum" NOT NULL DEFAULT 'active', "currentQuality" character varying(20) NOT NULL, "initialQuality" character varying(20) NOT NULL, "deviceType" "public"."streaming_sessions_devicetype_enum" NOT NULL DEFAULT 'unknown', "userAgent" character varying(500), "ipAddress" character varying(45), "bytesTransferred" bigint NOT NULL DEFAULT '0', "qualityChanges" integer NOT NULL DEFAULT '0', "bufferingEvents" integer NOT NULL DEFAULT '0', "totalBufferingTime" integer NOT NULL DEFAULT '0', "playbackTime" integer NOT NULL DEFAULT '0', "estimatedBandwidth" integer, "averageBitrate" double precision NOT NULL DEFAULT '0', "qualityHistory" json, "bufferingHistory" json, "errorLogs" json, "country" character varying(100), "city" character varying(100), "edgeServer" character varying(100), "startedAt" TIMESTAMP, "endedAt" TIMESTAMP, "lastActivityAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, CONSTRAINT "UQ_4aa80510b4575df66c292e89987" UNIQUE ("sessionId"), CONSTRAINT "PK_201536a9e168b9c96d94efd3c52" PRIMARY KEY ("id")); COMMENT ON COLUMN "streaming_sessions"."userId" IS '스트리밍 요청 사용자 ID'; COMMENT ON COLUMN "streaming_sessions"."sessionId" IS '세션 ID'; COMMENT ON COLUMN "streaming_sessions"."storageKey" IS '스트리밍 파일 키'; COMMENT ON COLUMN "streaming_sessions"."status" IS '세션 상태'; COMMENT ON COLUMN "streaming_sessions"."currentQuality" IS '현재 품질 설정'; COMMENT ON COLUMN "streaming_sessions"."initialQuality" IS '초기 품질 설정'; COMMENT ON COLUMN "streaming_sessions"."deviceType" IS '디바이스 타입'; COMMENT ON COLUMN "streaming_sessions"."userAgent" IS 'User Agent'; COMMENT ON COLUMN "streaming_sessions"."ipAddress" IS 'IP 주소'; COMMENT ON COLUMN "streaming_sessions"."bytesTransferred" IS '전송된 바이트 수'; COMMENT ON COLUMN "streaming_sessions"."qualityChanges" IS '품질 변경 횟수'; COMMENT ON COLUMN "streaming_sessions"."bufferingEvents" IS '버퍼링 이벤트 횟수'; COMMENT ON COLUMN "streaming_sessions"."totalBufferingTime" IS '총 버퍼링 시간 (초)'; COMMENT ON COLUMN "streaming_sessions"."playbackTime" IS '재생 시간 (초)'; COMMENT ON COLUMN "streaming_sessions"."estimatedBandwidth" IS '추정 대역폭 (bps)'; COMMENT ON COLUMN "streaming_sessions"."averageBitrate" IS '평균 비트레이트 (bps)'; COMMENT ON COLUMN "streaming_sessions"."qualityHistory" IS '품질 변경 기록'; COMMENT ON COLUMN "streaming_sessions"."bufferingHistory" IS '버퍼링 이벤트 기록'; COMMENT ON COLUMN "streaming_sessions"."errorLogs" IS '에러 로그'; COMMENT ON COLUMN "streaming_sessions"."country" IS '국가'; COMMENT ON COLUMN "streaming_sessions"."city" IS '도시'; COMMENT ON COLUMN "streaming_sessions"."edgeServer" IS 'CDN 엣지 서버'; COMMENT ON COLUMN "streaming_sessions"."startedAt" IS '스트리밍 시작 시간'; COMMENT ON COLUMN "streaming_sessions"."endedAt" IS '스트리밍 종료 시간'; COMMENT ON COLUMN "streaming_sessions"."lastActivityAt" IS '마지막 활동 시간'; COMMENT ON COLUMN "streaming_sessions"."createdAt" IS '생성 시간'; COMMENT ON COLUMN "streaming_sessions"."updatedAt" IS '수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7da4c89e756ebc2ad0e10cfd1c" ON "streaming_sessions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4aa80510b4575df66c292e8998" ON "streaming_sessions" ("sessionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8bcbe287b93ce79b74f1526e0" ON "streaming_sessions" ("storageKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_813574f76cc6f80e34b7be3020" ON "streaming_sessions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c48bc6e2a736a54172e48372f1" ON "streaming_sessions" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bae40d0905f9cfc420cf62c7cc" ON "streaming_sessions" ("storageKey", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c11115c2556c80155645ca709b" ON "streaming_sessions" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ffcb8f8152b459f7545c7ff03" ON "streaming_sessions" ("userId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "streaming_sessions" ADD CONSTRAINT "FK_b90ce4b647060200090b56b7077" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "streaming_sessions" DROP CONSTRAINT "FK_b90ce4b647060200090b56b7077"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ffcb8f8152b459f7545c7ff03"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c11115c2556c80155645ca709b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bae40d0905f9cfc420cf62c7cc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c48bc6e2a736a54172e48372f1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_813574f76cc6f80e34b7be3020"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8bcbe287b93ce79b74f1526e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4aa80510b4575df66c292e8998"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7da4c89e756ebc2ad0e10cfd1c"`,
    );
    await queryRunner.query(`DROP TABLE "streaming_sessions"`);
    await queryRunner.query(
      `DROP TYPE "public"."streaming_sessions_devicetype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."streaming_sessions_status_enum"`,
    );
  }
}
