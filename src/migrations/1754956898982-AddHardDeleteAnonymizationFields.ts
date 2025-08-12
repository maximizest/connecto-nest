import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHardDeleteAnonymizationFields1754956898982 implements MigrationInterface {
    name = 'AddHardDeleteAnonymizationFields1754956898982'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "file_uploads" ADD "isFromDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."isFromDeletedUser" IS '탈퇴한 사용자의 파일 여부'`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "isFromDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "messages"."isFromDeletedUser" IS '탈퇴한 사용자의 메시지 여부'`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "deletedUserType" character varying(20)`);
        await queryRunner.query(`COMMENT ON COLUMN "messages"."deletedUserType" IS '탈퇴한 사용자 타입 (user | admin)'`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "isDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "planet_users"."isDeletedUser" IS '탈퇴한 사용자의 기록 여부'`);
        await queryRunner.query(`ALTER TABLE "streaming_sessions" ADD "isFromDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "streaming_sessions"."isFromDeletedUser" IS '탈퇴한 사용자의 세션 여부'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "isDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "travel_users"."isDeletedUser" IS '탈퇴한 사용자의 기록 여부'`);
        await queryRunner.query(`ALTER TABLE "video_processing" ADD "isFromDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "video_processing"."isFromDeletedUser" IS '탈퇴한 사용자의 작업 여부'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77a304d841bf3286f8a730d319"`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29184560395328217ac21a8ea6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b3c4f4471f43b1a17771ae579"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40dc3de52ed041e48cfb116f2a"`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "senderId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP CONSTRAINT "UQ_7bfe37092ce6937249a233f2f82"`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ffcb8f8152b459f7545c7ff03"`);
        await queryRunner.query(`ALTER TABLE "streaming_sessions" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5389e29600e818b9dc863b04fa"`);
        await queryRunner.query(`ALTER TABLE "video_processing" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_9dc087b883828f932fe0fb4b4a" ON "file_uploads" ("isFromDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_77a304d841bf3286f8a730d319" ON "file_uploads" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_5a6f95fb11ecfb29035391f906" ON "messages" ("isFromDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_29184560395328217ac21a8ea6" ON "messages" ("senderId", "type", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b3c4f4471f43b1a17771ae579" ON "messages" ("planetId", "senderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_40dc3de52ed041e48cfb116f2a" ON "messages" ("senderId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_f5d51d0e9f7653744500f3479f" ON "planet_users" ("isDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_1644439439db10e26681c50f81" ON "streaming_sessions" ("isFromDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_2ffcb8f8152b459f7545c7ff03" ON "streaming_sessions" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_fff342734de957d485093cdc63" ON "travel_users" ("isDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_70960a34140f01844265764256" ON "video_processing" ("isFromDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_5389e29600e818b9dc863b04fa" ON "video_processing" ("userId", "status") `);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD CONSTRAINT "UQ_7bfe37092ce6937249a233f2f82" UNIQUE ("planetId", "userId")`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP CONSTRAINT "UQ_7bfe37092ce6937249a233f2f82"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5389e29600e818b9dc863b04fa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_70960a34140f01844265764256"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fff342734de957d485093cdc63"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ffcb8f8152b459f7545c7ff03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1644439439db10e26681c50f81"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f5d51d0e9f7653744500f3479f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40dc3de52ed041e48cfb116f2a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b3c4f4471f43b1a17771ae579"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29184560395328217ac21a8ea6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a6f95fb11ecfb29035391f906"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77a304d841bf3286f8a730d319"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9dc087b883828f932fe0fb4b4a"`);
        await queryRunner.query(`ALTER TABLE "video_processing" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_5389e29600e818b9dc863b04fa" ON "video_processing" ("userId", "status") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "streaming_sessions" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_2ffcb8f8152b459f7545c7ff03" ON "streaming_sessions" ("userId", "status") `);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD CONSTRAINT "UQ_7bfe37092ce6937249a233f2f82" UNIQUE ("planetId", "userId")`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "senderId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_40dc3de52ed041e48cfb116f2a" ON "messages" ("senderId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6b3c4f4471f43b1a17771ae579" ON "messages" ("planetId", "senderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_29184560395328217ac21a8ea6" ON "messages" ("type", "senderId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file_uploads" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_77a304d841bf3286f8a730d319" ON "file_uploads" ("userId", "status") `);
        await queryRunner.query(`COMMENT ON COLUMN "video_processing"."isFromDeletedUser" IS '탈퇴한 사용자의 작업 여부'`);
        await queryRunner.query(`ALTER TABLE "video_processing" DROP COLUMN "isFromDeletedUser"`);
        await queryRunner.query(`COMMENT ON COLUMN "travel_users"."isDeletedUser" IS '탈퇴한 사용자의 기록 여부'`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "isDeletedUser"`);
        await queryRunner.query(`COMMENT ON COLUMN "streaming_sessions"."isFromDeletedUser" IS '탈퇴한 사용자의 세션 여부'`);
        await queryRunner.query(`ALTER TABLE "streaming_sessions" DROP COLUMN "isFromDeletedUser"`);
        await queryRunner.query(`COMMENT ON COLUMN "planet_users"."isDeletedUser" IS '탈퇴한 사용자의 기록 여부'`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "isDeletedUser"`);
        await queryRunner.query(`COMMENT ON COLUMN "messages"."deletedUserType" IS '탈퇴한 사용자 타입 (user | admin)'`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "deletedUserType"`);
        await queryRunner.query(`COMMENT ON COLUMN "messages"."isFromDeletedUser" IS '탈퇴한 사용자의 메시지 여부'`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "isFromDeletedUser"`);
        await queryRunner.query(`COMMENT ON COLUMN "file_uploads"."isFromDeletedUser" IS '탈퇴한 사용자의 파일 여부'`);
        await queryRunner.query(`ALTER TABLE "file_uploads" DROP COLUMN "isFromDeletedUser"`);
    }

}
