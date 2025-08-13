import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveAdminOwnership1755049862856 implements MigrationInterface {
    name = 'RemoveAdminOwnership1755049862856'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travels" DROP CONSTRAINT "FK_f888c9e152bd64e46b06ee8eb0a"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP CONSTRAINT "FK_c0118735f471dd73aaf31ac70dd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f888c9e152bd64e46b06ee8eb0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97bd176e641bfce3764fcab16a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6679df20501185372228e896a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0118735f471dd73aaf31ac70d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_70e93ed2463be4bc70452603c4"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "createdByAdminId"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "createdByAdminId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "planets" ADD "createdByAdminId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "createdByAdminId" integer NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_70e93ed2463be4bc70452603c4" ON "planets" ("type", "createdByAdminId") `);
        await queryRunner.query(`CREATE INDEX "IDX_c0118735f471dd73aaf31ac70d" ON "planets" ("createdByAdminId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6679df20501185372228e896a6" ON "travels" ("createdByAdminId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_97bd176e641bfce3764fcab16a" ON "travels" ("createdByAdminId", "status", "endDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_f888c9e152bd64e46b06ee8eb0" ON "travels" ("createdByAdminId") `);
        await queryRunner.query(`ALTER TABLE "planets" ADD CONSTRAINT "FK_c0118735f471dd73aaf31ac70dd" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "travels" ADD CONSTRAINT "FK_f888c9e152bd64e46b06ee8eb0a" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
