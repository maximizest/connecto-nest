#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

const command = process.argv[2];
const migrationName = process.argv[3];

if (!command) {
  console.error('명령어를 입력해주세요: generate, create, run, revert');
  process.exit(1);
}

const baseCommand = 'typeorm-ts-node-commonjs';
const dataSource = '-d ./data-source.ts';

let fullCommand;

switch (command) {
  case 'generate':
    if (!migrationName) {
      console.error('마이그레이션 이름을 입력해주세요');
      process.exit(1);
    }
    fullCommand = `${baseCommand} migration:generate ${dataSource} ./src/migrations/${migrationName}`;
    break;
  
  case 'create':
    if (!migrationName) {
      console.error('마이그레이션 이름을 입력해주세요');
      process.exit(1);
    }
    fullCommand = `${baseCommand} migration:create ${dataSource} ./src/migrations/${migrationName}`;
    break;
  
  case 'run':
    fullCommand = `${baseCommand} migration:run ${dataSource}`;
    break;
  
  case 'revert':
    fullCommand = `${baseCommand} migration:revert ${dataSource}`;
    break;
  
  default:
    console.error('알 수 없는 명령어입니다: generate, create, run, revert 중 하나를 사용해주세요');
    process.exit(1);
}

console.log(`실행 중: ${fullCommand}`);
exec(fullCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`오류: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
});