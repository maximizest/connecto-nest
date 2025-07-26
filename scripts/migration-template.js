#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('마이그레이션 이름을 입력해주세요');
  process.exit(1);
}

const timestamp = Date.now();
const className = migrationName.charAt(0).toUpperCase() + migrationName.slice(1);
const fileName = `${timestamp}-${migrationName}.ts`;
const filePath = path.join('./src/migrations', fileName);

const template = `import { MigrationInterface, QueryRunner, Table, Column, Index } from 'typeorm';

export class ${className}${timestamp} implements MigrationInterface {
    name = '${className}${timestamp}';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 테이블 생성 예시
        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '200',
                        isNullable: false,
                        isUnique: true,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '10',
                        default: "'active'",
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('users');
    }
}
`;

fs.writeFileSync(filePath, template);
console.log(`마이그레이션 파일이 생성되었습니다: ${filePath}`);