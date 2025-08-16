import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLeftStatusFromTravelUser1755319964758
  implements MigrationInterface
{
  name = 'RemoveLeftStatusFromTravelUser1755319964758';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 이미 이전 마이그레이션에서 처리되었으므로 status enum만 업데이트
    
    // status enum에서 'left' 제거
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_status_enum" RENAME TO "travel_users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_status_enum" AS ENUM('active', 'banned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    
    // 'left' 상태를 'active'로 변경
    await queryRunner.query(
      `UPDATE "travel_users" SET "status" = 'active' WHERE "status" = 'left'`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down 마이그레이션 생략 (롤백 필요 없음)
  }
}