import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUser1751837952829 implements MigrationInterface {
  name = 'CreateUser1751837952829';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password" character varying(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
  }
}
