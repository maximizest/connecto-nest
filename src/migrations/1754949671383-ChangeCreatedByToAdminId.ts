import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCreatedByToAdminId1754949671383
  implements MigrationInterface
{
  name = 'ChangeCreatedByToAdminId1754949671383';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "travels" DROP CONSTRAINT "FK_aab47f49c5905c4ec321b1e40f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" DROP CONSTRAINT "FK_e4aa241d18d17e7227088d5bde5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aab47f49c5905c4ec321b1e40f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2133ee47bddbababf8be3b32cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b6d1a848b08eb3295654d72b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4aa241d18d17e7227088d5bde"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6de171d8cbf6c3b97270273142"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" RENAME COLUMN "createdBy" TO "createdByAdminId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" RENAME COLUMN "createdBy" TO "createdByAdminId"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "travels"."createdByAdminId" IS '여행 생성 관리자 ID'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "planets"."createdByAdminId" IS 'Planet 생성 관리자 ID'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."planet_users_role_enum" RENAME TO "planet_users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_role_enum" AS ENUM('participant', 'moderator')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" TYPE "public"."planet_users_role_enum" USING "role"::"text"::"public"."planet_users_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" SET DEFAULT 'participant'`,
    );
    await queryRunner.query(`DROP TYPE "public"."planet_users_role_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_f888c9e152bd64e46b06ee8eb0" ON "travels" ("createdByAdminId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4be69a39f660088b2339906403" ON "travels" ("createdByAdminId", "isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6679df20501185372228e896a6" ON "travels" ("createdByAdminId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0118735f471dd73aaf31ac70d" ON "planets" ("createdByAdminId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70e93ed2463be4bc70452603c4" ON "planets" ("createdByAdminId", "type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ADD CONSTRAINT "FK_f888c9e152bd64e46b06ee8eb0a" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ADD CONSTRAINT "FK_c0118735f471dd73aaf31ac70dd" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planets" DROP CONSTRAINT "FK_c0118735f471dd73aaf31ac70dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" DROP CONSTRAINT "FK_f888c9e152bd64e46b06ee8eb0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70e93ed2463be4bc70452603c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0118735f471dd73aaf31ac70d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6679df20501185372228e896a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4be69a39f660088b2339906403"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f888c9e152bd64e46b06ee8eb0"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_role_enum_old" AS ENUM('participant', 'creator', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" TYPE "public"."planet_users_role_enum_old" USING "role"::"text"::"public"."planet_users_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ALTER COLUMN "role" SET DEFAULT 'participant'`,
    );
    await queryRunner.query(`DROP TYPE "public"."planet_users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."planet_users_role_enum_old" RENAME TO "planet_users_role_enum"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "planets"."createdByAdminId" IS 'Planet 생성자 ID'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "travels"."createdByAdminId" IS '여행 생성자 ID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" RENAME COLUMN "createdByAdminId" TO "createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" RENAME COLUMN "createdByAdminId" TO "createdBy"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6de171d8cbf6c3b97270273142" ON "planets" ("type", "createdBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4aa241d18d17e7227088d5bde" ON "planets" ("createdBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b6d1a848b08eb3295654d72b4" ON "travels" ("createdBy", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2133ee47bddbababf8be3b32cf" ON "travels" ("createdBy", "isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aab47f49c5905c4ec321b1e40f" ON "travels" ("createdBy") `,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ADD CONSTRAINT "FK_e4aa241d18d17e7227088d5bde5" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ADD CONSTRAINT "FK_aab47f49c5905c4ec321b1e40f5" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
