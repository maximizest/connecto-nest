import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveLeftStatusFromTravelUser1755319964758 implements MigrationInterface {
    name = 'RemoveLeftStatusFromTravelUser1755319964758'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a1e52a4cae3da00380d2665d4b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3fb2c7d8802c2ca54b53020e04"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e36689e9fa9ee4a76542e12017"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c302178e0f3483a9fc535bd21b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fff342734de957d485093cdc63"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "lastSeenAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "leftAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "invitedBy"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "invitedAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "respondedAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "bannedBy"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "permissions"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "messageCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "createdPlanetCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "inviteCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "isDeletedUser"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b6335b63452e29e35db74964b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6eed6909a64c018ad1b237890b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_427bbaf4936558eb4a3f63aab7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b95562111431ed61ed2dd4ff9"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."travel_users_role_enum" RENAME TO "travel_users_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."travel_users_role_enum" AS ENUM('host', 'participant')`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" TYPE "public"."travel_users_role_enum" USING "role"::"text"::"public"."travel_users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" SET DEFAULT 'participant'`);
        await queryRunner.query(`DROP TYPE "public"."travel_users_role_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."travel_users_status_enum" RENAME TO "travel_users_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."travel_users_status_enum" AS ENUM('active', 'banned')`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" TYPE "public"."travel_users_status_enum" USING "status"::"text"::"public"."travel_users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."travel_users_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_2b6335b63452e29e35db74964b" ON "travel_users" ("travelId", "status", "role") `);
        await queryRunner.query(`CREATE INDEX "IDX_427bbaf4936558eb4a3f63aab7" ON "travel_users" ("status", "joinedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_6eed6909a64c018ad1b237890b" ON "travel_users" ("travelId", "role") `);
        await queryRunner.query(`CREATE INDEX "IDX_1b95562111431ed61ed2dd4ff9" ON "travel_users" ("travelId", "status") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b95562111431ed61ed2dd4ff9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6eed6909a64c018ad1b237890b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_427bbaf4936558eb4a3f63aab7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b6335b63452e29e35db74964b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`);
        await queryRunner.query(`CREATE TYPE "public"."travel_users_status_enum_old" AS ENUM('pending', 'active', 'left', 'banned', 'invited')`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" TYPE "public"."travel_users_status_enum_old" USING "status"::"text"::"public"."travel_users_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."travel_users_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."travel_users_status_enum_old" RENAME TO "travel_users_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."travel_users_role_enum_old" AS ENUM('member', 'admin', 'owner')`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" TYPE "public"."travel_users_role_enum_old" USING "role"::"text"::"public"."travel_users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "role" SET DEFAULT 'member'`);
        await queryRunner.query(`DROP TYPE "public"."travel_users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."travel_users_role_enum_old" RENAME TO "travel_users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "travel_users" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_1b95562111431ed61ed2dd4ff9" ON "travel_users" ("travelId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_427bbaf4936558eb4a3f63aab7" ON "travel_users" ("status", "joinedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6eed6909a64c018ad1b237890b" ON "travel_users" ("travelId", "role") `);
        await queryRunner.query(`CREATE INDEX "IDX_2b6335b63452e29e35db74964b" ON "travel_users" ("travelId", "role", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "isDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "metadata" json`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "inviteCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "createdPlanetCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "messageCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "settings" json`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "permissions" json`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "bannedBy" integer`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "respondedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "invitedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "invitedBy" integer`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "leftAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "lastSeenAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_fff342734de957d485093cdc63" ON "travel_users" ("isDeletedUser") `);
        await queryRunner.query(`CREATE INDEX "IDX_c302178e0f3483a9fc535bd21b" ON "travel_users" ("status", "invitedBy") `);
        await queryRunner.query(`CREATE INDEX "IDX_e36689e9fa9ee4a76542e12017" ON "travel_users" ("invitedBy") `);
        await queryRunner.query(`CREATE INDEX "IDX_3fb2c7d8802c2ca54b53020e04" ON "travel_users" ("leftAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_a1e52a4cae3da00380d2665d4b" ON "travel_users" ("lastSeenAt") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
