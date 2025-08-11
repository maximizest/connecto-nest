import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { setupTestConfiguration } from '../../src/common/config/app-setup.config';
import { AppModule } from '../../src/modules/app.module';
import { RedisService } from '../../src/modules/cache/redis.service';
import { TestDataManager, cleanTestEnvironment } from './test-data.helper';

/**
 * E2E 테스트용 NestJS 애플리케이션을 생성하는 공통 헬퍼 함수
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // 테스트 환경에서는 로거 비활성화
  const app = moduleFixture.createNestApplication({
    logger: false, // 모든 NestJS 로그 비활성화
  });

  // 테스트 환경 설정 적용 (Schema API 활성화 + 전역 설정)
  setupTestConfiguration(app);

  await app.init();
  return app;
}

/**
 * E2E 테스트 정리 함수
 */
export async function cleanupTestApp(app: INestApplication): Promise<void> {
  if (app) {
    try {
      // 테스트 데이터 정리
      const dataSource = app.get<DataSource>(DataSource);
      const redisService = app.get<RedisService>(RedisService);

      await cleanTestEnvironment(dataSource, redisService);
    } catch (error) {
      // 정리 실패해도 앱은 종료
      console.warn('Test cleanup failed:', error.message);
    }

    await app.close();
  }

  // Clean up environment variable
  delete process.env.ENABLE_SCHEMA_API;

  // Force cleanup any remaining timers/handles
  if (typeof global.gc === 'function') {
    global.gc();
  }
}

/**
 * E2E 테스트를 위한 describe 래퍼 함수
 * 자동으로 beforeEach와 afterAll을 설정하여 앱 생성/정리를 처리
 */
export function describeE2E(
  name: string,
  fn: (
    getApp: () => INestApplication,
    getTestData: () => TestDataManager,
  ) => void,
): void {
  describe(name, () => {
    let app: INestApplication;
    let testDataManager: TestDataManager;

    beforeEach(async () => {
      app = await createTestApp();

      // 테스트 데이터 매니저 초기화
      const dataSource = app.get<DataSource>(DataSource);
      const redisService = app.get<RedisService>(RedisService);
      testDataManager = new TestDataManager(dataSource, redisService);

      // 테스트 시작 전 데이터 정리
      await testDataManager.cleanAll();
    });

    afterAll(async () => {
      if (app) {
        await cleanupTestApp(app);
      }
    });

    // 테스트 함수에 앱과 테스트 데이터 매니저 제공
    fn(
      () => app,
      () => testDataManager,
    );
  });
}

/**
 * 간단한 E2E 테스트 래퍼 (기존 호환성 유지)
 */
export function describeSimpleE2E(
  name: string,
  fn: (getApp: () => INestApplication) => void,
): void {
  describe(name, () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createTestApp();

      // 간단한 데이터 정리
      try {
        const dataSource = app.get<DataSource>(DataSource);
        const redisService = app.get<RedisService>(RedisService);
        await cleanTestEnvironment(dataSource, redisService);
      } catch (error) {
        console.warn('Simple cleanup failed:', error.message);
      }
    });

    afterAll(async () => {
      if (app) {
        await cleanupTestApp(app);
      }
    });

    // 기존 방식: 앱만 제공
    fn(() => app);
  });
}
