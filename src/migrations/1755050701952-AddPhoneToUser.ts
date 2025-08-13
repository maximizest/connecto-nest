import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneToUser1755050701952 implements MigrationInterface {
    name = 'AddPhoneToUser1755050701952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying(20)`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS '전화번호'`);
        await queryRunner.query(`CREATE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a000cca60bcf04454e72769949"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."phone" IS '전화번호'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
    }

}
