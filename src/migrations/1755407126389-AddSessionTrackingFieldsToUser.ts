import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionTrackingFieldsToUser1755407126389 implements MigrationInterface {
    name = 'AddSessionTrackingFieldsToUser1755407126389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e4840fed5ef9baa08c4c314503"`);
        await queryRunner.query(`ALTER TYPE "public"."messages_status_enum" RENAME TO "messages_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read', 'failed')`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" TYPE "public"."messages_status_enum" USING "status"::"text"::"public"."messages_status_enum"`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'`);
        await queryRunner.query(`DROP TYPE "public"."messages_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_e4840fed5ef9baa08c4c314503" ON "messages" ("status", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e4840fed5ef9baa08c4c314503"`);
        await queryRunner.query(`CREATE TYPE "public"."messages_status_enum_old" AS ENUM('deleted', 'delivered', 'failed', 'read', 'sent')`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" TYPE "public"."messages_status_enum_old" USING "status"::"text"::"public"."messages_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'sent'`);
        await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."messages_status_enum_old" RENAME TO "messages_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_e4840fed5ef9baa08c4c314503" ON "messages" ("status", "createdAt") `);
    }

}
