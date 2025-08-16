import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementPlanetType1755311690427
  implements MigrationInterface
{
  name = 'AddAnnouncementPlanetType1755311690427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_788648558c18fba1e3806d7b9a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f019dabaf3859fab20e1da9c8b"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."planets_type_enum" RENAME TO "planets_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_type_enum" AS ENUM('group', 'direct', 'announcement')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "type" TYPE "public"."planets_type_enum" USING "type"::"text"::"public"."planets_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."planets_type_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_788648558c18fba1e3806d7b9a" ON "planets" ("type", "isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f019dabaf3859fab20e1da9c8b" ON "planets" ("travelId", "type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f019dabaf3859fab20e1da9c8b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_788648558c18fba1e3806d7b9a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_type_enum_old" AS ENUM('group', 'direct')`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ALTER COLUMN "type" TYPE "public"."planets_type_enum_old" USING "type"::"text"::"public"."planets_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."planets_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."planets_type_enum_old" RENAME TO "planets_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f019dabaf3859fab20e1da9c8b" ON "planets" ("type", "travelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_788648558c18fba1e3806d7b9a" ON "planets" ("type", "isActive") `,
    );
  }
}
