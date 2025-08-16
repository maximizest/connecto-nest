import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserLanguageTimezone1755309765447 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove language and timezone columns from users table
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "language"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
        // Note: lastSeenAt doesn't exist in the users table, so no need to remove it
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore language and timezone columns
        await queryRunner.query(`ALTER TABLE "users" ADD "language" character varying(10) DEFAULT 'ko'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "timezone" character varying(50) DEFAULT 'Asia/Seoul'`);
    }

}
