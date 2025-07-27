#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting production deployment...');

/**
 * 마이그레이션 실행 함수
 */
function runMigration() {
  return new Promise((resolve, reject) => {
    console.log('📦 Running database migrations...');

    const migrationCommand = 'typeorm-ts-node-commonjs migration:run -d ./data-source.ts';

    exec(migrationCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Migration failed:', error.message);
        reject(error);
        return;
      }

      if (stderr) {
        console.warn('⚠️ Migration warnings:', stderr);
      }

      console.log('✅ Migration completed successfully');
      console.log(stdout);
      resolve();
    });
  });
}

/**
 * 앱 시작 함수
 */
function startApp() {
  return new Promise((resolve, reject) => {
    console.log('🌟 Starting NestJS application...');

    const startCommand = 'node dist/main';

    const appProcess = exec(startCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ App start failed:', error.message);
        reject(error);
        return;
      }

      if (stderr) {
        console.error('App stderr:', stderr);
      }

      console.log(stdout);
    });

    // 앱 프로세스의 출력을 실시간으로 표시
    appProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    appProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    appProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`App exited with code ${code}`));
      }
    });

    // SIGTERM 및 SIGINT 신호 처리 (Graceful shutdown)
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      appProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      appProcess.kill('SIGINT');
    });
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // 환경 정보 출력
    console.log('📋 Environment Information:');
    console.log(`   - Node.js Version: ${process.version}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Database Host: ${process.env.DATABASE_HOST || 'not set'}`);
    console.log(`   - Database Name: ${process.env.DATABASE_NAME || 'not set'}`);

    // 마이그레이션 실행
    await runMigration();

    // 잠시 대기 (마이그레이션 완료 확인)
    console.log('⏳ Waiting for migration to settle...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 앱 시작
    await startApp();

  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 