import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleAndDropAdminTable1755390690859 implements MigrationInterface {
    name = 'AddUserRoleAndDropAdminTable1755390690859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'host', 'user')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."role" IS '사용자 역할 (ADMIN/HOST/USER)'`);
        await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."role" IS '사용자 역할 (ADMIN/HOST/USER)'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
