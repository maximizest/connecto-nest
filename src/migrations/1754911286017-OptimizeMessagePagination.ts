import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeMessagePagination1754911286017
  implements MigrationInterface
{
  name = 'OptimizeMessagePagination1754911286017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Message 페이지네이션 최적화를 위한 복합 인덱스들

    // 1. Planet별 메시지 커서 페이지네이션 최적화 (createdAt DESC, id DESC)
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_planet_pagination" ON "messages" ("planetId", "createdAt" DESC, "id" DESC) WHERE "isDeleted" = false`,
    );

    // 2. Planet별 메시지 + 타입 필터링 (시스템 메시지 제외)
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_planet_type_pagination" ON "messages" ("planetId", "type", "createdAt" DESC, "id" DESC) WHERE "isDeleted" = false`,
    );

    // 3. 전문 검색 최적화를 위한 GIN 인덱스 (한국어 지원)
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_fulltext_search" ON "messages" USING GIN (to_tsvector('korean', "searchableText")) WHERE "isDeleted" = false`,
    );

    // 4. Planet별 특정 날짜 범위 메시지 조회 최적화
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_planet_date_range" ON "messages" ("planetId", "createdAt", "id") WHERE "isDeleted" = false`,
    );

    // 5. 답글/스레드 조회 최적화
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_replies" ON "messages" ("replyToMessageId", "createdAt" ASC) WHERE "replyToMessageId" IS NOT NULL AND "isDeleted" = false`,
    );

    // 6. 메시지 읽음 상태 조회 최적화 (읽지 않은 메시지 카운트)
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_message_read_receipts_unread" ON "message_read_receipts" ("planetId", "userId", "isRead", "createdAt") WHERE "isRead" = false`,
    );

    // 7. Planet별 메시지 통계 최적화
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_planet_stats" ON "messages" ("planetId", "type", "createdAt") WHERE "isDeleted" = false`,
    );

    // 8. 발신자별 메시지 조회 최적화
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_sender_planet" ON "messages" ("senderId", "planetId", "createdAt" DESC) WHERE "isDeleted" = false`,
    );

    // 9. 편집된 메시지 조회 최적화
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_edited" ON "messages" ("planetId", "isEdited", "editedAt" DESC) WHERE "isEdited" = true AND "isDeleted" = false`,
    );

    // 10. 파일/미디어 메시지 조회 최적화 (타입별 필터링)
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_messages_media_type" ON "messages" ("planetId", "type", "createdAt" DESC) WHERE "type" IN ('IMAGE', 'VIDEO', 'FILE') AND "isDeleted" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 생성된 인덱스들 제거 (역순)
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_media_type"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_edited"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_sender_planet"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_planet_stats"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_message_read_receipts_unread"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_replies"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_planet_date_range"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_fulltext_search"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_planet_type_pagination"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "public"."IDX_messages_planet_pagination"`,
    );
  }
}
