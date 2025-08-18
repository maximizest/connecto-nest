import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccommodationTable1755556185016 implements MigrationInterface {
    name = 'CreateAccommodationTable1755556185016'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "accommodations" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a422a200297f93cd5ac87d049e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "travels" ADD "accommodationId" integer`);
        await queryRunner.query(`ALTER TABLE "travels" ADD CONSTRAINT "FK_332a338506821d969b14b471269" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "travels" DROP CONSTRAINT "FK_332a338506821d969b14b471269"`);
        await queryRunner.query(`ALTER TABLE "travels" DROP COLUMN "accommodationId"`);
        await queryRunner.query(`DROP TABLE "accommodations"`);
    }

}
