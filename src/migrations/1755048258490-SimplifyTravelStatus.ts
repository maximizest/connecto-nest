import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyTravelStatus1755048258490 implements MigrationInterface {
  name = 'SimplifyTravelStatus1755048258490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4fb0a4e891a5be7dd4b3cbb7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6679df20501185372228e896a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec9f1a2347f9666d860d57fef2"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."travels_status_enum" RENAME TO "travels_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travels_status_enum" AS ENUM('planning', 'active')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" TYPE "public"."travels_status_enum" USING "status"::"text"::"public"."travels_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" SET DEFAULT 'planning'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travels_status_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_6679df20501185372228e896a6" ON "travels" ("createdByAdminId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec9f1a2347f9666d860d57fef2" ON "travels" ("status", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4fb0a4e891a5be7dd4b3cbb7b" ON "travels" ("status", "isActive") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4fb0a4e891a5be7dd4b3cbb7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec9f1a2347f9666d860d57fef2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6679df20501185372228e896a6"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travels_status_enum_old" AS ENUM('planning', 'active', 'completed', 'cancelled', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" TYPE "public"."travels_status_enum_old" USING "status"::"text"::"public"."travels_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" SET DEFAULT 'planning'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travels_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."travels_status_enum_old" RENAME TO "travels_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec9f1a2347f9666d860d57fef2" ON "travels" ("status", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6679df20501185372228e896a6" ON "travels" ("createdByAdminId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4fb0a4e891a5be7dd4b3cbb7b" ON "travels" ("status", "isActive") `,
    );
  }
}
