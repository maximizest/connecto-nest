import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTravelUserColumns1755315055343
  implements MigrationInterface
{
  name = 'RemoveTravelUserColumns1755315055343';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 제약조건과 인덱스를 안전하게 삭제
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT IF EXISTS "FK_e36689e9fa9ee4a76542e12017e"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_a1e52a4cae3da00380d2665d4b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3fb2c7d8802c2ca54b53020e04"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e36689e9fa9ee4a76542e12017"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_c302178e0f3483a9fc535bd21b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_fff342734de957d485093cdc63"`,
    );

    // 컬럼이 존재하는 경우에만 삭제
    const columns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'travel_users' AND table_schema = 'public'`,
    );
    const columnNames = columns.map((c: any) => c.column_name);

    if (columnNames.includes('lastSeenat')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "lastSeenAt"`,
      );
    }
    if (columnNames.includes('leftat')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "leftAt"`,
      );
    }
    if (columnNames.includes('invitedby')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "invitedBy"`,
      );
    }
    if (columnNames.includes('invitedat')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "invitedAt"`,
      );
    }
    if (columnNames.includes('respondedat')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "respondedAt"`,
      );
    }
    if (columnNames.includes('bannedby')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "bannedBy"`,
      );
    }
    if (columnNames.includes('permissions')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "permissions"`,
      );
    }
    if (columnNames.includes('settings')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "settings"`,
      );
    }
    if (columnNames.includes('messagecount')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "messageCount"`,
      );
    }
    if (columnNames.includes('createdplanetcount')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "createdPlanetCount"`,
      );
    }
    if (columnNames.includes('invitecount')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "inviteCount"`,
      );
    }
    if (columnNames.includes('metadata')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "metadata"`,
      );
    }
    if (columnNames.includes('isdeleteduser')) {
      await queryRunner.query(
        `ALTER TABLE "travel_users" DROP COLUMN "isDeletedUser"`,
      );
    }

    // 제약조건 안전하게 삭제
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT IF EXISTS "FK_5e444d7fbe7d18cc67c3b4bcf44"`,
    );

    // 인덱스 안전하게 삭제
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_4b7423cc1117c15104daec4346"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_c53692ef08b82fb3ba4555097d"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2b6335b63452e29e35db74964b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_6eed6909a64c018ad1b237890b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_427bbaf4936558eb4a3f63aab7"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_1b95562111431ed61ed2dd4ff9"`,
    );

    // 유니크 제약조건 안전하게 삭제
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT IF EXISTS "UQ_cb3fb6e2f9ba7cbfaa55243691d"`,
    );

    // userId NOT NULL 설정
    await queryRunner.query(
      `ALTER TABLE "travel_users" ALTER COLUMN "userId" SET NOT NULL`,
    );

    // role enum 타입 변경
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

    // status enum 타입 변경
    await queryRunner.query(
      `ALTER TYPE "public"."travel_users_status_enum" RENAME TO "travel_users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_status_enum" AS ENUM('active', 'left', 'banned')`,
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

    // 새로운 인덱스 생성
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

    // 새로운 제약조건 추가
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down 마이그레이션 생략 (롤백 필요 없음)
  }
}
