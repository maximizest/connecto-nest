import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveIsReadAndReadAtFromNotifications1755327629474 implements MigrationInterface {
    name = 'RemoveIsReadAndReadAtFromNotifications1755327629474'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove notification read tracking indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8ba28344602d583583b9ea1a50"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_5340fc241f57310d243e5ab20b"`);
        
        // Remove notification read tracking columns
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "isRead"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "readAt"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "deliveryResults"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore notification columns
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveryResults" json`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "readAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "isRead" boolean NOT NULL DEFAULT false`);
        
        // Restore notification indexes
        await queryRunner.query(`CREATE INDEX "IDX_5340fc241f57310d243e5ab20b" ON "notifications" ("isRead") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ba28344602d583583b9ea1a50" ON "notifications" ("userId", "isRead") `);
    }
}