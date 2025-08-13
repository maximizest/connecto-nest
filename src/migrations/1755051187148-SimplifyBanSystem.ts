import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyBanSystem1755051187148 implements MigrationInterface {
    name = 'SimplifyBanSystem1755051187148'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_96056fe8ab8748b090b8419ad3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e179ff3144072962c9664df09"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "banExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "banExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "banExpiresAt"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."isBanned" IS '계정 정지 여부 (로그인 불가)'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "users"."isBanned" IS '계정 정지 여부'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "banExpiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "planet_users" ADD "banExpiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "banExpiresAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_7e179ff3144072962c9664df09" ON "users" ("isBanned", "banExpiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_96056fe8ab8748b090b8419ad3" ON "users" ("banExpiresAt") `);
    }

}
