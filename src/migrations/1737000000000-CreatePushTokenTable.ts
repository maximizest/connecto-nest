import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushTokenTable1737000000000 implements MigrationInterface {
  name = 'CreatePushTokenTable1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for platform
    await queryRunner.query(
      `CREATE TYPE "public"."push_tokens_platform_enum" AS ENUM('ios', 'android', 'web')`,
    );

    // Create push_tokens table
    await queryRunner.query(
      `CREATE TABLE "push_tokens" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "token" character varying(500) NOT NULL,
        "platform" "public"."push_tokens_platform_enum" NOT NULL,
        "deviceId" character varying(255) NOT NULL,
        "appVersion" character varying(50),
        "deviceModel" character varying(255),
        "osVersion" character varying(50),
        "isTokenActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP,
        "failureCount" integer NOT NULL DEFAULT '0',
        "lastFailureAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_tokens" PRIMARY KEY ("id")
      )`,
    );

    // Create unique index for userId + deviceId
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_push_tokens_userId_deviceId" ON "push_tokens" ("userId", "deviceId")`,
    );

    // Create other indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_token" ON "push_tokens" ("token")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_platform" ON "push_tokens" ("platform")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_isTokenActive" ON "push_tokens" ("isTokenActive")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_userId_isTokenActive" ON "push_tokens" ("userId", "isTokenActive")`,
    );

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_push_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_userId"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_tokens_userId_isTokenActive"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_tokens_isTokenActive"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_tokens_platform"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_tokens_token"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_tokens_userId_deviceId"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "push_tokens"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "public"."push_tokens_platform_enum"`);
  }
}