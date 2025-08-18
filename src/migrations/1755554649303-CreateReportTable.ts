import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportTable1755554649303 implements MigrationInterface {
  name = 'CreateReportTable1755554649303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."reports_type_enum" AS ENUM('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'VIOLENCE', 'HATE_SPEECH', 'FRAUD', 'PRIVACY_VIOLATION', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_context_enum" AS ENUM('TRAVEL', 'PLANET', 'MESSAGE', 'USER_PROFILE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" SERIAL NOT NULL, "reporterId" integer NOT NULL, "reportedUserId" integer NOT NULL, "type" "public"."reports_type_enum" NOT NULL DEFAULT 'OTHER', "context" "public"."reports_context_enum" NOT NULL, "description" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'PENDING', "travelId" integer, "planetId" integer, "messageId" integer, "reviewedBy" integer, "adminNotes" text, "reviewedAt" TIMESTAMP, "resolvedAt" TIMESTAMP, "metadata" jsonb, "evidenceUrls" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d2f93ff6fe926339467ff5de9" ON "reports" ("planetId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_733f2032a2585701046df8828e" ON "reports" ("travelId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_781a2c0adee4125f1f6906a14a" ON "reports" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b21fcd774b30b0367c50d5864d" ON "reports" ("reportedUserId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ab110fefb1c3c833e2d6d1776" ON "reports" ("reporterId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_4353be8309ce86650def2f8572d" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_c88d2686339ad6d166620b741a6" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_14d8ccffa14457dfbc9ef0c1229" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_af50d540af0d8e3bf1763c8fc0b" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_7867c6f5d2606991b3580e3e0dd" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_0a05f4c9ed9e5c5396b5275efe6" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_0a05f4c9ed9e5c5396b5275efe6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_7867c6f5d2606991b3580e3e0dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_af50d540af0d8e3bf1763c8fc0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_14d8ccffa14457dfbc9ef0c1229"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_c88d2686339ad6d166620b741a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "FK_4353be8309ce86650def2f8572d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ab110fefb1c3c833e2d6d1776"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b21fcd774b30b0367c50d5864d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_781a2c0adee4125f1f6906a14a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_733f2032a2585701046df8828e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d2f93ff6fe926339467ff5de9"`,
    );
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_context_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_type_enum"`);
  }
}
