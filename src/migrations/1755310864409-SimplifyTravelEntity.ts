import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyTravelEntity1755310864409 implements MigrationInterface {
    name = 'SimplifyTravelEntity1755310864409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_db62f526a964878cf88774366e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_nickname"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_gender"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_age"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_occupation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_gender_age"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_profile_occupation_age"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "inviteCodeEnabled"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "maxPlanets"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "maxGroupMembers"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "memberCount"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "planetCount"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "totalMessages"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "lastActivityAt"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "metadata"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travels" ADD "metadata" json`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "settings" json`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "lastActivityAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "totalMessages" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "planetCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "memberCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "maxGroupMembers" integer NOT NULL DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "maxPlanets" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "inviteCodeEnabled" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "IDX_profile_occupation_age" ON "profiles" ("age", "occupation") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_gender_age" ON "profiles" ("gender", "age") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_occupation" ON "profiles" ("occupation") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_age" ON "profiles" ("age") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_gender" ON "profiles" ("gender") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_name" ON "profiles" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_profile_nickname" ON "profiles" ("nickname") `);
        await queryRunner.query(`CREATE INDEX "IDX_db62f526a964878cf88774366e" ON "travels" ("lastActivityAt") `);
    }

}
