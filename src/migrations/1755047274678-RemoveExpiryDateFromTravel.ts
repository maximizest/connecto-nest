import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExpiryDateFromTravel1755047274678
  implements MigrationInterface
{
  name = 'RemoveExpiryDateFromTravel1755047274678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23e6daba79c39cfeabbe392c24"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4aae6d1c93e593cb1f0aab1efa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd3938a1923f9c141a64c6ecb6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4be69a39f660088b2339906403"`,
    );
    await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "expiryDate"`);
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "endDate" SET NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "travels"."endDate" IS '여행 종료 예정 날짜 (채팅 만료 날짜)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f732b17f85938280e27e71df6" ON "travels" ("endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c53a3bf8e6b92ede0538f20cea" ON "travels" ("createdByAdminId", "isActive", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec9f1a2347f9666d860d57fef2" ON "travels" ("status", "endDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b890b2829ba1a119dc038b06be" ON "travels" ("isActive", "endDate") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b890b2829ba1a119dc038b06be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec9f1a2347f9666d860d57fef2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c53a3bf8e6b92ede0538f20cea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f732b17f85938280e27e71df6"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "travels"."endDate" IS '여행 종료 예정 날짜'`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ALTER COLUMN "endDate" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ADD "expiryDate" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4be69a39f660088b2339906403" ON "travels" ("createdByAdminId", "isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd3938a1923f9c141a64c6ecb6" ON "travels" ("isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4aae6d1c93e593cb1f0aab1efa" ON "travels" ("status", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23e6daba79c39cfeabbe392c24" ON "travels" ("expiryDate") `,
    );
  }
}
