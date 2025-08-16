import { MigrationInterface, QueryRunner } from "typeorm";

export class SimplifyProfileEntity1755310085208 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns (check if they don't exist first)
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "nickname" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "name" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" character varying`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "age" integer`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "occupation" character varying(100)`);
        
        // Create indexes for new columns (if they don't exist)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_nickname" ON "profiles" ("nickname")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_name" ON "profiles" ("name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_gender" ON "profiles" ("gender")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_age" ON "profiles" ("age")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_occupation" ON "profiles" ("occupation")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_gender_age" ON "profiles" ("gender", "age")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_occupation_age" ON "profiles" ("occupation", "age")`);
        
        // Drop old columns
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "bio"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "profileImage"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "coverImage"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "birthday"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "hobbies"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "interests"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "website"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "socialLinks"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "education"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "work"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "skills"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "profileImageUrl"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "settings"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore old columns
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "bio" text`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profileImage" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "coverImage" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "birthday" date`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "hobbies" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "interests" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "website" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "socialLinks" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "education" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "work" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "skills" json`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profileImageUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "settings" json`);
        
        // Drop indexes for new columns
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_occupation_age"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_gender_age"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_occupation"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_age"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_gender"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_name"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_profile_nickname"`);
        
        // Drop new columns
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "nickname"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "name"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "gender"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "age"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "occupation"`);
    }

}