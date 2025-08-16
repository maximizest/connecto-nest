import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserLanguageTimezone1755309735507 implements MigrationInterface {
    name = 'RemoveUserLanguageTimezone1755309735507'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "language"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "timezone" character varying(50) NOT NULL DEFAULT 'Asia/Seoul'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "language" character varying(10) NOT NULL DEFAULT 'ko'`);
    }

}
