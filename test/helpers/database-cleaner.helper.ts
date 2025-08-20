import { DataSource, EntityManager } from 'typeorm';
import { ENTITIES } from '../../src/config/database.config';

/**
 * 데이터베이스 정리 헬퍼
 * 테스트 간 데이터베이스 상태를 초기화하여 테스트 격리를 보장
 */
export class DatabaseCleaner {
  constructor(private dataSource: DataSource) {}

  /**
   * 모든 테이블의 데이터를 삭제 (테이블 구조는 유지)
   */
  async cleanAll(): Promise<void> {
    const entityManager = this.dataSource.manager;

    // 외래키 제약조건을 일시적으로 비활성화
    await this.disableForeignKeyChecks(entityManager);

    try {
      // 모든 엔티티 테이블의 데이터 삭제
      for (const entity of ENTITIES.reverse()) {
        // 역순으로 삭제 (의존성 고려)
        const tableName = this.getTableName(entity);
        await entityManager.query(
          `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
        );
      }
    } finally {
      // 외래키 제약조건 재활성화
      await this.enableForeignKeyChecks(entityManager);
    }
  }

  /**
   * 특정 엔티티 테이블만 정리
   */
  async cleanTable(entityClass: any): Promise<void> {
    const entityManager = this.dataSource.manager;
    const tableName = this.getTableName(entityClass);

    await entityManager.query(
      `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
    );
  }

  /**
   * 여러 엔티티 테이블들을 정리
   */
  async cleanTables(entityClasses: any[]): Promise<void> {
    const entityManager = this.dataSource.manager;

    await this.disableForeignKeyChecks(entityManager);

    try {
      for (const entityClass of entityClasses.reverse()) {
        const tableName = this.getTableName(entityClass);
        await entityManager.query(
          `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
        );
      }
    } finally {
      await this.enableForeignKeyChecks(entityManager);
    }
  }

  /**
   * 데이터베이스 스키마를 완전히 재생성 (주의: 모든 데이터 손실)
   */
  async recreateSchema(): Promise<void> {
    await this.dataSource.dropDatabase();
    await this.dataSource.synchronize(true);
  }

  /**
   * 테이블별 레코드 수 확인 (디버깅용)
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const entityManager = this.dataSource.manager;
    const counts: Record<string, number> = {};

    for (const entity of ENTITIES) {
      const tableName = this.getTableName(entity);
      try {
        const result = await entityManager.query(
          `SELECT COUNT(*) as count FROM "${tableName}";`,
        );
        counts[tableName] = parseInt(result[0]?.count || '0');
      } catch (_error) {
        counts[tableName] = -1; // 에러 표시
      }
    }

    return counts;
  }

  /**
   * 시퀀스 초기화 (PostgreSQL)
   */
  async resetSequences(): Promise<void> {
    const entityManager = this.dataSource.manager;

    for (const entity of ENTITIES) {
      const tableName = this.getTableName(entity);
      try {
        // 시퀀스가 있는 테이블의 시퀀스를 1로 초기화
        await entityManager.query(
          `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), 1, false);`,
        );
      } catch (_error) {
        // 시퀀스가 없는 테이블은 무시
      }
    }
  }

  /**
   * 외래키 제약조건 비활성화 (PostgreSQL)
   */
  private async disableForeignKeyChecks(
    entityManager: EntityManager,
  ): Promise<void> {
    await entityManager.query('SET session_replication_role = replica;');
  }

  /**
   * 외래키 제약조건 활성화 (PostgreSQL)
   */
  private async enableForeignKeyChecks(
    entityManager: EntityManager,
  ): Promise<void> {
    await entityManager.query('SET session_replication_role = DEFAULT;');
  }

  /**
   * 엔티티 클래스에서 테이블명 추출
   */
  private getTableName(entityClass: any): string {
    const metadata = this.dataSource.getMetadata(entityClass);
    return metadata.tableName;
  }
}

/**
 * 간편한 데이터베이스 정리 함수들
 */
export const createDatabaseCleaner = (
  dataSource: DataSource,
): DatabaseCleaner => {
  return new DatabaseCleaner(dataSource);
};

/**
 * 전체 데이터베이스 정리 (가장 자주 사용)
 */
export const cleanDatabase = async (dataSource: DataSource): Promise<void> => {
  const cleaner = new DatabaseCleaner(dataSource);
  await cleaner.cleanAll();
};

/**
 * 특정 테이블만 정리
 */
export const cleanTable = async (
  dataSource: DataSource,
  entityClass: any,
): Promise<void> => {
  const cleaner = new DatabaseCleaner(dataSource);
  await cleaner.cleanTable(entityClass);
};

/**
 * 여러 테이블 정리
 */
export const cleanTables = async (
  dataSource: DataSource,
  entityClasses: any[],
): Promise<void> => {
  const cleaner = new DatabaseCleaner(dataSource);
  await cleaner.cleanTables(entityClasses);
};
