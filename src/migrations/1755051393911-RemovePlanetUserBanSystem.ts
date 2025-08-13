import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePlanetUserBanSystem1755051393911 implements MigrationInterface {
    name = 'RemovePlanetUserBanSystem1755051393911'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "isBanned"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "bannedAt"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "bannedBy"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "banReason"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b695cd6a2251661385019f2ee4"`);
        await queryRunner.query(`ALTER TYPE "public"."planet_users_status_enum" RENAME TO "planet_users_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."planet_users_status_enum" AS ENUM('active', 'left', 'invited', 'muted')`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" TYPE "public"."planet_users_status_enum" USING "status"::"text"::"public"."planet_users_status_enum"`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."planet_users_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_b695cd6a2251661385019f2ee4" ON "planet_users" ("planetId", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b695cd6a2251661385019f2ee4"`);
        await queryRunner.query(`CREATE TYPE "public"."planet_users_status_enum_old" AS ENUM('active', 'left', 'banned', 'invited', 'muted')`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" TYPE "public"."planet_users_status_enum_old" USING "status"::"text"::"public"."planet_users_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "planet_users" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`DROP TYPE "public"."planet_users_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."planet_users_status_enum_old" RENAME TO "planet_users_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_b695cd6a2251661385019f2ee4" ON "planet_users" ("planetId", "status") `);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "banReason" text`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "bannedBy" integer`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "bannedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "isBanned" boolean NOT NULL DEFAULT false`);
    }

}
