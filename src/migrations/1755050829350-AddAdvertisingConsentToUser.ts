import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdvertisingConsentToUser1755050829350 implements MigrationInterface {
    name = 'AddAdvertisingConsentToUser1755050829350'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "advertisingConsentEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."advertisingConsentEnabled" IS '광고성 알림 수신 동의 여부'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`COMMENT ON COLUMN "users"."advertisingConsentEnabled" IS '광고성 알림 수신 동의 여부'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "advertisingConsentEnabled"`);
    }

}
