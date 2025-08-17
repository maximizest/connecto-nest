import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNotificationMetadata1755388944020 implements MigrationInterface {
    name = 'RemoveNotificationMetadata1755388944020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "lastSeenAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "leftAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "invitedBy"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "invitedAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "respondedAt"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "bannedBy"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "messageCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "createdPlanetCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "inviteCount"`);
        await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "isDeletedUser"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d06d6169ad1f3d8f83d63902b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3363924e627d40f4b945c3276f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cfc4757bd393ac9aec5dde530"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab221329a9f4c2111690d52f34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('message', 'mention', 'reply', 'banned', 'system')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_status_enum" RENAME TO "notifications_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'delivered', 'failed')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum" USING "status"::"text"::"public"."notifications_status_enum"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_5d06d6169ad1f3d8f83d63902b" ON "notifications" ("planetId", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_3363924e627d40f4b945c3276f" ON "notifications" ("travelId", "type") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab221329a9f4c2111690d52f34" ON "notifications" ("status", "scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8cfc4757bd393ac9aec5dde530" ON "notifications" ("userId", "type", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cfc4757bd393ac9aec5dde530"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab221329a9f4c2111690d52f34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3363924e627d40f4b945c3276f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d06d6169ad1f3d8f83d63902b"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum_old" AS ENUM('cancelled', 'delivered', 'failed', 'pending', 'read', 'sent')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum_old" USING "status"::"text"::"public"."notifications_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_status_enum_old" RENAME TO "notifications_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('message_deleted', 'message_edited', 'message_mention', 'message_received', 'message_reply', 'planet_created', 'planet_deleted', 'planet_invitation', 'planet_member_joined', 'planet_member_left', 'planet_updated', 'system_announcement', 'system_maintenance', 'system_update', 'travel_deleted', 'travel_expired', 'travel_expiry_warning', 'travel_invitation', 'travel_join_request', 'travel_member_joined', 'travel_member_left', 'travel_updated', 'user_banned', 'user_role_changed', 'user_unbanned')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_ab221329a9f4c2111690d52f34" ON "notifications" ("status", "scheduledAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8cfc4757bd393ac9aec5dde530" ON "notifications" ("userId", "type", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_3363924e627d40f4b945c3276f" ON "notifications" ("type", "travelId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d06d6169ad1f3d8f83d63902b" ON "notifications" ("type", "planetId") `);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "isDeletedUser" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "inviteCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "createdPlanetCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "messageCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "bannedBy" integer`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "respondedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "invitedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "invitedBy" integer`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "leftAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "travel_users" ADD "lastSeenAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "metadata" json`);
    }

}
