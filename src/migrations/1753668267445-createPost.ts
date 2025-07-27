import { MigrationInterface, QueryRunner } from "typeorm";

export class createPost1753668267445 implements MigrationInterface {
  name = 'createPost1753668267445'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "posts" (
                "id" SERIAL NOT NULL, 
                "title" character varying(200) NOT NULL, 
                "content" text NOT NULL, 
                "summary" character varying(500), 
                "isPublished" boolean NOT NULL DEFAULT true, 
                "viewCount" integer NOT NULL DEFAULT '0', 
                "userId" integer NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "posts" 
            ADD CONSTRAINT "FK_ae05faaa55c866130abef6e1fee" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_ae05faaa55c866130abef6e1fee"`);
    await queryRunner.query(`DROP TABLE "posts"`);
  }
} 