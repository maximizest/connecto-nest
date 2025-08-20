import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1737500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Message 테이블: planetId + createdAt 복합 인덱스 (메시지 목록 조회 최적화)
    await queryRunner.query(
      `CREATE INDEX "IDX_message_planet_created" ON "messages" ("planetId", "createdAt" DESC)`
    );

    // 2. Notification 테이블: userId + isRead 복합 인덱스 (안 읽은 알림 조회 최적화)
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_user_read" ON "notifications" ("userId", "isRead")`
    );

    // 3. Travel 테이블: status + visibility 복합 인덱스 (공개 여행 목록 최적화)
    await queryRunner.query(
      `CREATE INDEX "IDX_travel_status_visibility" ON "travels" ("status", "visibility")`
    );

    // 4. PlanetUser 테이블: userId + status 복합 인덱스 (사용자의 활성 채팅방 조회)
    await queryRunner.query(
      `CREATE INDEX "IDX_planet_user_user_status" ON "planet_users" ("userId", "status")`
    );

    // 5. TravelUser 테이블: userId + status 복합 인덱스 (사용자의 활성 여행 조회)
    await queryRunner.query(
      `CREATE INDEX "IDX_travel_user_user_status" ON "travel_users" ("userId", "status")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_travel_user_user_status"`);
    await queryRunner.query(`DROP INDEX "IDX_planet_user_user_status"`);
    await queryRunner.query(`DROP INDEX "IDX_travel_status_visibility"`);
    await queryRunner.query(`DROP INDEX "IDX_notification_user_read"`);
    await queryRunner.query(`DROP INDEX "IDX_message_planet_created"`);
  }
}