import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePerformanceMonitoringTables1754912195011 implements MigrationInterface {
    name = 'CreatePerformanceMonitoringTables1754912195011'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."analytics_type_enum" AS ENUM('travel_overview', 'travel_members', 'travel_activity', 'travel_engagement', 'travel_growth', 'planet_activity', 'planet_messages', 'planet_engagement', 'planet_performance', 'user_activity', 'user_engagement', 'user_journey', 'system_performance', 'system_usage')`);
        await queryRunner.query(`CREATE TYPE "public"."analytics_period_enum" AS ENUM('hourly', 'daily', 'weekly', 'monthly', 'yearly')`);
        await queryRunner.query(`CREATE TABLE "analytics" ("id" SERIAL NOT NULL, "type" "public"."analytics_type_enum" NOT NULL, "entityType" character varying(50) NOT NULL, "entityId" integer NOT NULL, "period" "public"."analytics_period_enum" NOT NULL, "date" date NOT NULL, "metrics" json NOT NULL, "dimensions" json, "comparison" json, "forecast" json, "label" character varying(100), "description" text, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c96dcbf1e4c57ea9e0c3144bff" PRIMARY KEY ("id")); COMMENT ON COLUMN "analytics"."type" IS '분석 데이터 타입'; COMMENT ON COLUMN "analytics"."entityType" IS '대상 엔티티 타입 (travel, planet, user 등)'; COMMENT ON COLUMN "analytics"."entityId" IS '대상 엔티티 ID'; COMMENT ON COLUMN "analytics"."period" IS '집계 주기'; COMMENT ON COLUMN "analytics"."date" IS '집계 날짜'; COMMENT ON COLUMN "analytics"."metrics" IS '집계된 메트릭 데이터 (JSON)'; COMMENT ON COLUMN "analytics"."dimensions" IS '차원별 분석 데이터 (JSON)'; COMMENT ON COLUMN "analytics"."comparison" IS '이전 기간 대비 변화량 (JSON)'; COMMENT ON COLUMN "analytics"."forecast" IS '예측/전망 데이터 (JSON)'; COMMENT ON COLUMN "analytics"."label" IS '분석 데이터 제목/라벨'; COMMENT ON COLUMN "analytics"."description" IS '분석 데이터 설명'; COMMENT ON COLUMN "analytics"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "analytics"."createdAt" IS '분석 데이터 생성 시간'; COMMENT ON COLUMN "analytics"."updatedAt" IS '분석 데이터 수정 시간'`);
        await queryRunner.query(`CREATE INDEX "IDX_0f60eaca1334fca31ef3c28588" ON "analytics" ("entityType") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ed6d4b0e2e5467752cb14a44d" ON "analytics" ("entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_19da8ae5e50dce0825eeaf1d1f" ON "analytics" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ddb1767051ba238bb698c3e08" ON "analytics" ("type", "period", "date") `);
        await queryRunner.query(`CREATE INDEX "IDX_efb0bbda7c7b63593f3b65db2d" ON "analytics" ("entityType", "entityId", "date") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8d9e131a97cc6e9d00979720c" ON "analytics" ("type", "entityType", "entityId", "period") `);
        await queryRunner.query(`CREATE INDEX "IDX_19da8ae5e50dce0825eeaf1d1f" ON "analytics" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_7f7b67c0ae5e101b71e86a0cf5" ON "analytics" ("period") `);
        await queryRunner.query(`CREATE INDEX "IDX_aabb82adb6a7a3163667b5b486" ON "analytics" ("entityType", "entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2de1d3124c07ed32d4c9e0c2a6" ON "analytics" ("type") `);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('message_received', 'message_mention', 'message_reply', 'message_edited', 'message_deleted', 'travel_invitation', 'travel_join_request', 'travel_member_joined', 'travel_member_left', 'travel_expiry_warning', 'travel_expired', 'travel_updated', 'travel_deleted', 'planet_created', 'planet_invitation', 'planet_member_joined', 'planet_member_left', 'planet_updated', 'planet_deleted', 'user_banned', 'user_unbanned', 'user_role_changed', 'system_announcement', 'system_maintenance', 'system_update')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying(100) NOT NULL, "content" text NOT NULL, "priority" "public"."notifications_priority_enum" NOT NULL DEFAULT 'normal', "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'pending', "isRead" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP, "travelId" integer, "planetId" integer, "messageId" integer, "triggeredBy" integer, "channels" json NOT NULL, "deliveryResults" json, "scheduledAt" TIMESTAMP, "expiresAt" TIMESTAMP, "data" json, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")); COMMENT ON COLUMN "notifications"."userId" IS '알림 받을 사용자 ID'; COMMENT ON COLUMN "notifications"."type" IS '알림 타입'; COMMENT ON COLUMN "notifications"."title" IS '알림 제목'; COMMENT ON COLUMN "notifications"."content" IS '알림 내용'; COMMENT ON COLUMN "notifications"."priority" IS '알림 우선순위'; COMMENT ON COLUMN "notifications"."status" IS '알림 상태'; COMMENT ON COLUMN "notifications"."isRead" IS '읽음 여부'; COMMENT ON COLUMN "notifications"."readAt" IS '읽은 시간'; COMMENT ON COLUMN "notifications"."travelId" IS '관련 Travel ID'; COMMENT ON COLUMN "notifications"."planetId" IS '관련 Planet ID'; COMMENT ON COLUMN "notifications"."messageId" IS '관련 메시지 ID'; COMMENT ON COLUMN "notifications"."triggeredBy" IS '알림 발생시킨 사용자 ID'; COMMENT ON COLUMN "notifications"."channels" IS '전송할 채널 목록'; COMMENT ON COLUMN "notifications"."deliveryResults" IS '채널별 전송 결과'; COMMENT ON COLUMN "notifications"."scheduledAt" IS '예약 전송 시간'; COMMENT ON COLUMN "notifications"."expiresAt" IS '알림 만료 시간'; COMMENT ON COLUMN "notifications"."data" IS '알림 관련 추가 데이터 (JSON)'; COMMENT ON COLUMN "notifications"."metadata" IS '알림 메타데이터 (JSON)'; COMMENT ON COLUMN "notifications"."createdAt" IS '알림 생성 시간'; COMMENT ON COLUMN "notifications"."updatedAt" IS '알림 정보 수정 시간'`);
        await queryRunner.query(`CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_aef1c7aef3725068e5540f8f00" ON "notifications" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ba28344602d583583b9ea1a50" ON "notifications" ("isRead") `);
        await queryRunner.query(`CREATE INDEX "IDX_357d60c1b7e4a2e9466d6ff356" ON "notifications" ("travelId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c92fb969e67cbf7208462ebc0" ON "notifications" ("planetId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b3bff6ef995abfa317b8ec8699" ON "notifications" ("scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d06d6169ad1f3d8f83d63902b" ON "notifications" ("planetId", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_3363924e627d40f4b945c3276f" ON "notifications" ("travelId", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab221329a9f4c2111690d52f34" ON "notifications" ("status", "scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8cfc4757bd393ac9aec5dde530" ON "notifications" ("userId", "type", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_5340fc241f57310d243e5ab20b" ON "notifications" ("userId", "isRead") `);
        await queryRunner.query(`CREATE INDEX "IDX_b3bff6ef995abfa317b8ec8699" ON "notifications" ("scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_831a5a06f879fb0bebf8965871" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ba28344602d583583b9ea1a50" ON "notifications" ("isRead") `);
        await queryRunner.query(`CREATE INDEX "IDX_1d992705797d7d2d5a3853ad9c" ON "notifications" ("priority") `);
        await queryRunner.query(`CREATE INDEX "IDX_92f5d3a7779be163cbea7916c6" ON "notifications" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_aef1c7aef3725068e5540f8f00" ON "notifications" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_357d60c1b7e4a2e9466d6ff356d" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_0c92fb969e67cbf7208462ebc04" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_7dca5807b6d8c844cfc9f93ce08" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_7dca5807b6d8c844cfc9f93ce08"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_0c92fb969e67cbf7208462ebc04"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_357d60c1b7e4a2e9466d6ff356d"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aef1c7aef3725068e5540f8f00"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92f5d3a7779be163cbea7916c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d992705797d7d2d5a3853ad9c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ba28344602d583583b9ea1a50"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_831a5a06f879fb0bebf8965871"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3bff6ef995abfa317b8ec8699"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5340fc241f57310d243e5ab20b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cfc4757bd393ac9aec5dde530"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab221329a9f4c2111690d52f34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3363924e627d40f4b945c3276f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d06d6169ad1f3d8f83d63902b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3bff6ef995abfa317b8ec8699"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c92fb969e67cbf7208462ebc0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_357d60c1b7e4a2e9466d6ff356"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ba28344602d583583b9ea1a50"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aef1c7aef3725068e5540f8f00"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2de1d3124c07ed32d4c9e0c2a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aabb82adb6a7a3163667b5b486"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f7b67c0ae5e101b71e86a0cf5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19da8ae5e50dce0825eeaf1d1f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8d9e131a97cc6e9d00979720c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efb0bbda7c7b63593f3b65db2d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ddb1767051ba238bb698c3e08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19da8ae5e50dce0825eeaf1d1f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ed6d4b0e2e5467752cb14a44d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f60eaca1334fca31ef3c28588"`);
        await queryRunner.query(`DROP TABLE "analytics"`);
        await queryRunner.query(`DROP TYPE "public"."analytics_period_enum"`);
        await queryRunner.query(`DROP TYPE "public"."analytics_type_enum"`);
    }

}
