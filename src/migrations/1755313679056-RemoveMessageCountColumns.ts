import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveMessageCountColumns1755313679056 implements MigrationInterface {
    name = 'RemoveMessageCountColumns1755313679056'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "replyCount"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "readCount"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "readCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "replyCount" integer NOT NULL DEFAULT '0'`);
    }

}
