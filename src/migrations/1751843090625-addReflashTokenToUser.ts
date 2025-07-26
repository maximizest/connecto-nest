import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReflashTokenToUser1751843090625 implements MigrationInterface {
  name = 'AddReflashTokenToUser1751843090625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refreshToken" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
  }
}
