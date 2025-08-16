import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePlanetStatusArchivedBlocked1755312090226
  implements MigrationInterface
{
  name = 'RemovePlanetStatusArchivedBlocked1755312090226';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, update any existing ARCHIVED or BLOCKED status to INACTIVE
    await queryRunner.query(
      `UPDATE "planets" SET "status" = 'inactive' WHERE "status" IN ('archived', 'blocked')`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_68de525d0258210981bb4f6408"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."planets_status_enum" RENAME TO "planets_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" TYPE "public"."planets_status_enum" USING "status"::"text"::"public"."planets_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."planets_status_enum_old"`);
    await queryRunner.query(
      `COMMENT ON COLUMN "planets"."status" IS 'Planet 상태 (ACTIVE/INACTIVE)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_68de525d0258210981bb4f6408" ON "planets" ("travelId", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68de525d0258210981bb4f6408"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "planets"."status" IS 'Planet 상태'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_status_enum_old" AS ENUM('active', 'inactive', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" TYPE "public"."planets_status_enum_old" USING "status"::"text"::"public"."planets_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."planets_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."planets_status_enum_old" RENAME TO "planets_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_68de525d0258210981bb4f6408" ON "planets" ("travelId", "status") `,
    );
  }
}
