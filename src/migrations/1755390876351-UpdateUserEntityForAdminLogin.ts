import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserEntityForAdminLogin1755390876351
  implements MigrationInterface
{
  name = 'UpdateUserEntityForAdminLogin1755390876351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df40ea35845296666f010e5d60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying(255)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."password" IS '비밀번호 (bcrypt 해시, ADMIN 전용)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "socialId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."socialId" IS '소셜 로그인 고유 ID (ADMIN은 null)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "provider" DROP NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."provider" IS '소셜 로그인 제공자 (ADMIN은 null)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d19c813c766a22da57ef922a64" ON "users" ("socialId", "provider") WHERE "socialId" IS NOT NULL AND "provider" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d19c813c766a22da57ef922a64"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."provider" IS '소셜 로그인 제공자 (Google, Apple)'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "provider" SET NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."socialId" IS '소셜 로그인 고유 ID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "socialId" SET NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "users"."password" IS '비밀번호 (bcrypt 해시, ADMIN 전용)'`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_df40ea35845296666f010e5d60" ON "users" ("socialId", "provider") `,
    );
  }
}
