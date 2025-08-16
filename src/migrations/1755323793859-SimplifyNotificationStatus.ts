import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyNotificationStatus1755323793859
  implements MigrationInterface
{
  name = 'SimplifyNotificationStatus1755323793859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP CONSTRAINT "FK_5103d0c0e7e3c1ebcc2bbff514b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75f9c367325d72ee720fb6959f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33d45514d19073da22af67c3ac"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1e52a4cae3da00380d2665d4b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3fb2c7d8802c2ca54b53020e04"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e36689e9fa9ee4a76542e12017"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c302178e0f3483a9fc535bd21b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fff342734de957d485093cdc63"`,
    );
    await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."planet_users_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "lastSeenAt"`,
    );
    await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "leftAt"`);
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "invitedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "invitedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "respondedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "lastReadMessageId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "lastReadAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "unreadCount"`,
    );
    await queryRunner.query(`ALTER TABLE "planet_users" DROP COLUMN "isMuted"`);
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "muteUntil"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "permissions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "personalSettings"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "messageCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "fileCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "firstMessageAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "lastMessageAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "lastSeenAt"`,
    );
    await queryRunner.query(`ALTER TABLE "travel_users" DROP COLUMN "leftAt"`);
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "invitedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "invitedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "respondedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "bannedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "permissions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "settings"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "messageCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "createdPlanetCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "inviteCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP COLUMN "isDeletedUser"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d06d6169ad1f3d8f83d63902b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3363924e627d40f4b945c3276f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8cfc4757bd393ac9aec5dde530"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab221329a9f4c2111690d52f34"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('message', 'mention', 'reply', 'banned', 'system')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_status_enum" RENAME TO "notifications_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'delivered', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum" USING "status"::"text"::"public"."notifications_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notifications_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b695cd6a2251661385019f2ee4"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."planet_users_status_enum" RENAME TO "planet_users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_status_enum" AS ENUM('active', 'banned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" TYPE "public"."planet_users_status_enum" USING "status"::"text"::"public"."planet_users_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."planet_users_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b6335b63452e29e35db74964b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6eed6909a64c018ad1b237890b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_427bbaf4936558eb4a3f63aab7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b95562111431ed61ed2dd4ff9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_role_enum" RENAME TO "travel_users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_role_enum" AS ENUM('host', 'participant')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" TYPE "public"."travel_users_role_enum" USING "role"::"text"::"public"."travel_users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" SET DEFAULT 'participant'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travel_users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_status_enum" RENAME TO "travel_users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_status_enum" AS ENUM('active', 'banned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" TYPE "public"."travel_users_status_enum" USING "status"::"text"::"public"."travel_users_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."travel_users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d06d6169ad1f3d8f83d63902b" ON "notifications" ("planetId", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3363924e627d40f4b945c3276f" ON "notifications" ("travelId", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab221329a9f4c2111690d52f34" ON "notifications" ("status", "scheduledAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cfc4757bd393ac9aec5dde530" ON "notifications" ("userId", "type", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b695cd6a2251661385019f2ee4" ON "planet_users" ("planetId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b6335b63452e29e35db74964b" ON "travel_users" ("travelId", "status", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_427bbaf4936558eb4a3f63aab7" ON "travel_users" ("status", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6eed6909a64c018ad1b237890b" ON "travel_users" ("travelId", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b95562111431ed61ed2dd4ff9" ON "travel_users" ("travelId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b95562111431ed61ed2dd4ff9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6eed6909a64c018ad1b237890b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_427bbaf4936558eb4a3f63aab7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b6335b63452e29e35db74964b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b695cd6a2251661385019f2ee4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8cfc4757bd393ac9aec5dde530"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab221329a9f4c2111690d52f34"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3363924e627d40f4b945c3276f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d06d6169ad1f3d8f83d63902b"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_status_enum_old" AS ENUM('pending', 'active', 'left', 'banned', 'invited')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" TYPE "public"."travel_users_status_enum_old" USING "status"::"text"::"public"."travel_users_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travel_users_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_status_enum_old" RENAME TO "travel_users_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_role_enum_old" AS ENUM('member', 'admin', 'owner')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" TYPE "public"."travel_users_role_enum_old" USING "role"::"text"::"public"."travel_users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "role" SET DEFAULT 'member'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travel_users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_role_enum_old" RENAME TO "travel_users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b95562111431ed61ed2dd4ff9" ON "travel_users" ("travelId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_427bbaf4936558eb4a3f63aab7" ON "travel_users" ("status", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6eed6909a64c018ad1b237890b" ON "travel_users" ("travelId", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b6335b63452e29e35db74964b" ON "travel_users" ("travelId", "role", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_status_enum_old" AS ENUM('active', 'left', 'invited', 'muted')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" TYPE "public"."planet_users_status_enum_old" USING "status"::"text"::"public"."planet_users_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."planet_users_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."planet_users_status_enum_old" RENAME TO "planet_users_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b695cd6a2251661385019f2ee4" ON "planet_users" ("planetId", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_status_enum_old" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum_old" USING "status"::"text"::"public"."notifications_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_status_enum_old" RENAME TO "notifications_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('message_received', 'message_mention', 'message_reply', 'message_edited', 'message_deleted', 'travel_invitation', 'travel_join_request', 'travel_member_joined', 'travel_member_left', 'travel_expiry_warning', 'travel_expired', 'travel_updated', 'travel_deleted', 'planet_created', 'planet_invitation', 'planet_member_joined', 'planet_member_left', 'planet_updated', 'planet_deleted', 'user_banned', 'user_unbanned', 'user_role_changed', 'system_announcement', 'system_maintenance', 'system_update')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab221329a9f4c2111690d52f34" ON "notifications" ("status", "scheduledAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cfc4757bd393ac9aec5dde530" ON "notifications" ("userId", "type", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3363924e627d40f4b945c3276f" ON "notifications" ("type", "travelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d06d6169ad1f3d8f83d63902b" ON "notifications" ("type", "planetId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "isDeletedUser" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "travel_users" ADD "metadata" json`);
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "inviteCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "createdPlanetCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "messageCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "travel_users" ADD "settings" json`);
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "permissions" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "bannedBy" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "respondedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "invitedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "invitedBy" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "leftAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD "lastSeenAt" TIMESTAMP`,
    );
    await queryRunner.query(`ALTER TABLE "planet_users" ADD "metadata" json`);
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "lastMessageAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "firstMessageAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "fileCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "messageCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "personalSettings" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "permissions" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "muteUntil" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "isMuted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "unreadCount" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "lastReadAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "lastReadMessageId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "respondedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "invitedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "invitedBy" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "leftAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "lastSeenAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_role_enum" AS ENUM('participant', 'moderator')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD "role" "public"."planet_users_role_enum" NOT NULL DEFAULT 'participant'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fff342734de957d485093cdc63" ON "travel_users" ("isDeletedUser") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c302178e0f3483a9fc535bd21b" ON "travel_users" ("status", "invitedBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e36689e9fa9ee4a76542e12017" ON "travel_users" ("invitedBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fb2c7d8802c2ca54b53020e04" ON "travel_users" ("leftAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1e52a4cae3da00380d2665d4b" ON "travel_users" ("lastSeenAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33d45514d19073da22af67c3ac" ON "planet_users" ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75f9c367325d72ee720fb6959f" ON "planet_users" ("lastReadMessageId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD CONSTRAINT "FK_5103d0c0e7e3c1ebcc2bbff514b" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
