import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyTravelVisibility1755049473479 implements MigrationInterface {
    name = 'SimplifyTravelVisibility1755049473479'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e0ef4a2b2acd9e90fa7aad7d22"`);
        await queryRunner.query(`ALTER TYPE "public"."travels_visibility_enum" RENAME TO "travels_visibility_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."travels_visibility_enum" AS ENUM('public', 'invite_only')`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" TYPE "public"."travels_visibility_enum" USING "visibility"::"text"::"public"."travels_visibility_enum"`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" SET DEFAULT 'public'`);
        await queryRunner.query(`DROP TYPE "public"."travels_visibility_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_e0ef4a2b2acd9e90fa7aad7d22" ON "travels" ("visibility", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e0ef4a2b2acd9e90fa7aad7d22"`);
        await queryRunner.query(`CREATE TYPE "public"."travels_visibility_enum_old" AS ENUM('public', 'private', 'invite_only')`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" TYPE "public"."travels_visibility_enum_old" USING "visibility"::"text"::"public"."travels_visibility_enum_old"`);
        await queryRunner.query(`ALTER TABLE "travels" ALTER COLUMN "visibility" SET DEFAULT 'invite_only'`);
        await queryRunner.query(`DROP TYPE "public"."travels_visibility_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."travels_visibility_enum_old" RENAME TO "travels_visibility_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_e0ef4a2b2acd9e90fa7aad7d22" ON "travels" ("status", "visibility") `);
    }

}
