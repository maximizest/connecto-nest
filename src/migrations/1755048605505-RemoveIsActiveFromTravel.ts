import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsActiveFromTravel1755048605505
  implements MigrationInterface
{
  name = 'RemoveIsActiveFromTravel1755048605505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6749e5c85f0c4c389188bc670d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0f6bb380e067912ecc66cdd5f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c53a3bf8e6b92ede0538f20cea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b890b2829ba1a119dc038b06be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4fb0a4e891a5be7dd4b3cbb7b"`,
    );
    await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "isActive"`);
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
      `CREATE TYPE "public"."travels_status_enum" AS ENUM('inactive', 'active')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" TYPE "public"."travels_status_enum" USING "status"::"text"::"public"."travels_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "status" SET DEFAULT 'inactive'`,
    );
    await queryRunner.query(`DROP TYPE "public"."travels_status_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_97bd176e641bfce3764fcab16a" ON "travels" ("createdByAdminId", "status", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6679df20501185372228e896a6" ON "travels" ("createdByAdminId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0ef4a2b2acd9e90fa7aad7d22" ON "travels" ("visibility", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec9f1a2347f9666d860d57fef2" ON "travels" ("status", "endDate") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec9f1a2347f9666d860d57fef2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0ef4a2b2acd9e90fa7aad7d22"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6679df20501185372228e896a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97bd176e641bfce3764fcab16a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travels_status_enum_old" AS ENUM('planning', 'active')`,
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
      `ALTER TABLE "travels" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4fb0a4e891a5be7dd4b3cbb7b" ON "travels" ("status", "isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b890b2829ba1a119dc038b06be" ON "travels" ("isActive", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c53a3bf8e6b92ede0538f20cea" ON "travels" ("createdByAdminId", "isActive", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f6bb380e067912ecc66cdd5f6" ON "travels" ("isActive", "visibility") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6749e5c85f0c4c389188bc670d" ON "travels" ("isActive") `,
    );
  }
}
