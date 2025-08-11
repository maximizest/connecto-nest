import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageReadReceiptsTable1754906563718
  implements MigrationInterface
{
  name = 'CreateMessageReadReceiptsTable1754906563718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "message_read_receipts" ("id" SERIAL NOT NULL, "messageId" integer NOT NULL, "userId" integer NOT NULL, "planetId" integer NOT NULL, "isRead" boolean NOT NULL DEFAULT true, "readAt" TIMESTAMP NOT NULL DEFAULT now(), "deviceType" character varying(50), "userAgent" character varying(500), "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_14760574686d908c45d6d01e66b" UNIQUE ("messageId", "userId"), CONSTRAINT "PK_765a476d3a8f61e3cb7e634a12d" PRIMARY KEY ("id")); COMMENT ON COLUMN "message_read_receipts"."messageId" IS '메시지 ID'; COMMENT ON COLUMN "message_read_receipts"."userId" IS '사용자 ID'; COMMENT ON COLUMN "message_read_receipts"."planetId" IS 'Planet ID'; COMMENT ON COLUMN "message_read_receipts"."isRead" IS '읽음 여부'; COMMENT ON COLUMN "message_read_receipts"."readAt" IS '읽은 시간'; COMMENT ON COLUMN "message_read_receipts"."deviceType" IS '읽은 디바이스 타입'; COMMENT ON COLUMN "message_read_receipts"."userAgent" IS 'User Agent'; COMMENT ON COLUMN "message_read_receipts"."metadata" IS '추가 읽음 메타데이터'; COMMENT ON COLUMN "message_read_receipts"."createdAt" IS '읽음 영수증 생성 시간'; COMMENT ON COLUMN "message_read_receipts"."updatedAt" IS '읽음 영수증 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b27375e3d32b327050103cf6d" ON "message_read_receipts" ("messageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1623e4199eb5e0d7296a8b7001" ON "message_read_receipts" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26bff4fa0608d13320f6190e89" ON "message_read_receipts" ("planetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1fd7f571013a6ff16989ec2b67" ON "message_read_receipts" ("isRead") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2424661325554a5f311edba865" ON "message_read_receipts" ("readAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5cf5f31935f02d1a0d826e406" ON "message_read_receipts" ("planetId", "messageId", "userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba0217f42f94cb307275fbaa21" ON "message_read_receipts" ("planetId", "userId", "readAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e7617348fe6ebc428baf261a00" ON "message_read_receipts" ("userId", "isRead") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a895db011eb67687a96983e2a" ON "message_read_receipts" ("messageId", "isRead") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35f4639557c709dc5ea16bcd47" ON "message_read_receipts" ("planetId", "isRead") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_25fedd09f1d588d47a17c63627" ON "message_read_receipts" ("planetId", "userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" ADD CONSTRAINT "FK_7b27375e3d32b327050103cf6df" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" ADD CONSTRAINT "FK_1623e4199eb5e0d7296a8b70014" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" ADD CONSTRAINT "FK_26bff4fa0608d13320f6190e89a" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" DROP CONSTRAINT "FK_26bff4fa0608d13320f6190e89a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" DROP CONSTRAINT "FK_1623e4199eb5e0d7296a8b70014"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_read_receipts" DROP CONSTRAINT "FK_7b27375e3d32b327050103cf6df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26bff4fa0608d13320f6190e89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1623e4199eb5e0d7296a8b7001"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b27375e3d32b327050103cf6d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2424661325554a5f311edba865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1fd7f571013a6ff16989ec2b67"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25fedd09f1d588d47a17c63627"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35f4639557c709dc5ea16bcd47"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a895db011eb67687a96983e2a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e7617348fe6ebc428baf261a00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba0217f42f94cb307275fbaa21"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e5cf5f31935f02d1a0d826e406"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2424661325554a5f311edba865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1fd7f571013a6ff16989ec2b67"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26bff4fa0608d13320f6190e89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1623e4199eb5e0d7296a8b7001"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b27375e3d32b327050103cf6d"`,
    );
    await queryRunner.query(`DROP TABLE "message_read_receipts"`);
  }
}
