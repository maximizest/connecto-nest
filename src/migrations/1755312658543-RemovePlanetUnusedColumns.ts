import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePlanetUnusedColumns1755312658543 implements MigrationInterface {
    name = 'RemovePlanetUnusedColumns1755312658543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "planets" DROP CONSTRAINT "FK_ee8cf285073ffc55c4e1185cd1a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b13da0eaf6dd939079539f2b65"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24a3e4bf7aabe83d7979796c75"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_72cb259a83425cb3683f0577b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a0d637e2260b129070b2f4eec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee8cf285073ffc55c4e1185cd1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cc1cac38c163a79396bbe9d859"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eee212e33743a60f811a333c19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_36d9c08ea0fc09772a29855277"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_788648558c18fba1e3806d7b9a"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "memberCount"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "maxMembers"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "messageCount"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "lastMessageAt"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "lastMessagePreview"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "lastMessageUserId"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "partnerId"`);
        await queryRunner.query(`ALTER TABLE "planets" DROP COLUMN "metadata"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "planets" ADD "metadata" json`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "partnerId" integer`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "settings" json`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "lastMessageUserId" integer`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "lastMessagePreview" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "lastMessageAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "messageCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "maxMembers" integer NOT NULL DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "memberCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "planets" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE INDEX "IDX_788648558c18fba1e3806d7b9a" ON "planets" ("type", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_36d9c08ea0fc09772a29855277" ON "planets" ("travelId", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_eee212e33743a60f811a333c19" ON "planets" ("isActive", "lastMessageAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_cc1cac38c163a79396bbe9d859" ON "planets" ("travelId", "isActive", "lastMessageAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_ee8cf285073ffc55c4e1185cd1" ON "planets" ("partnerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a0d637e2260b129070b2f4eec" ON "planets" ("lastMessageAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_72cb259a83425cb3683f0577b5" ON "planets" ("messageCount") `);
        await queryRunner.query(`CREATE INDEX "IDX_24a3e4bf7aabe83d7979796c75" ON "planets" ("memberCount") `);
        await queryRunner.query(`CREATE INDEX "IDX_b13da0eaf6dd939079539f2b65" ON "planets" ("isActive") `);
        await queryRunner.query(`ALTER TABLE "planets" ADD CONSTRAINT "FK_ee8cf285073ffc55c4e1185cd1a" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
