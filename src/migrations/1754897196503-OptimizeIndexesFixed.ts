import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeIndexesFixed1754897196503 implements MigrationInterface {
  name = 'OptimizeIndexesFixed1754897196503';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users 테이블 인덱스
    await queryRunner.query(
      `CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_836026b660a661f0dbdc467bf1" ON "users" ("isBanned") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96056fe8ab8748b090b8419ad3" ON "users" ("banExpiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0d5efa4db71a540f016110b32d" ON "users" ("isOnline", "lastSeenAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e179ff3144072962c9664df09" ON "users" ("isBanned", "banExpiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe9fad8d1971b7fded468011a2" ON "users" ("provider", "isOnline") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b91ab6d821bbe820b09753a151" ON "users" ("status", "isOnline") `,
    );

    // Travels 테이블 인덱스
    await queryRunner.query(
      `CREATE INDEX "IDX_db62f526a964878cf88774366e" ON "travels" ("lastActivityAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2133ee47bddbababf8be3b32cf" ON "travels" ("createdBy", "isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b6d1a848b08eb3295654d72b4" ON "travels" ("createdBy", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f6bb380e067912ecc66cdd5f6" ON "travels" ("visibility", "isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4aae6d1c93e593cb1f0aab1efa" ON "travels" ("status", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd3938a1923f9c141a64c6ecb6" ON "travels" ("isActive", "expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4fb0a4e891a5be7dd4b3cbb7b" ON "travels" ("status", "isActive") `,
    );

    // Planets 테이블 인덱스
    await queryRunner.query(
      `CREATE INDEX "IDX_24a3e4bf7aabe83d7979796c75" ON "planets" ("memberCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72cb259a83425cb3683f0577b5" ON "planets" ("messageCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc1cac38c163a79396bbe9d859" ON "planets" ("travelId", "isActive", "lastMessageAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eee212e33743a60f811a333c19" ON "planets" ("isActive", "lastMessageAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6de171d8cbf6c3b97270273142" ON "planets" ("createdBy", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_788648558c18fba1e3806d7b9a" ON "planets" ("type", "isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_68de525d0258210981bb4f6408" ON "planets" ("travelId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36d9c08ea0fc09772a29855277" ON "planets" ("travelId", "isActive") `,
    );

    // Messages 테이블 인덱스
    await queryRunner.query(
      `CREATE INDEX "IDX_5af59aa83a3b266bb35c0b5573" ON "messages" ("isEdited") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0262e5d715a726bdaefe6340e5" ON "messages" ("editedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50e74137f3a0ca84a100130f3f" ON "messages" ("searchableText") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29184560395328217ac21a8ea6" ON "messages" ("senderId", "type", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_706eed08cb5e027fe5e9fcb9a0" ON "messages" ("planetId", "isDeleted", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_67588f76828ebebd2bfe971afd" ON "messages" ("planetId", "type", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4840fed5ef9baa08c4c314503" ON "messages" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfe166ccdd53722597a90f6324" ON "messages" ("type", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b6f42dcafbc76eb6f4f8bc5c5" ON "messages" ("planetId", "isDeleted") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b3c4f4471f43b1a17771ae579" ON "messages" ("planetId", "senderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3f7cfa28b3ec132c53b48114b" ON "messages" ("planetId", "type") `,
    );

    // Travel_users 테이블 인덱스
    await queryRunner.query(
      `CREATE INDEX "IDX_a1e52a4cae3da00380d2665d4b" ON "travel_users" ("lastSeenAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fb2c7d8802c2ca54b53020e04" ON "travel_users" ("leftAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e36689e9fa9ee4a76542e12017" ON "travel_users" ("invitedBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c302178e0f3483a9fc535bd21b" ON "travel_users" ("invitedBy", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b7423cc1117c15104daec4346" ON "travel_users" ("userId", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b6335b63452e29e35db74964b" ON "travel_users" ("travelId", "status", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_427bbaf4936558eb4a3f63aab7" ON "travel_users" ("status", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c53692ef08b82fb3ba4555097d" ON "travel_users" ("userId", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Travel_users 테이블 인덱스 삭제
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c53692ef08b82fb3ba4555097d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_427bbaf4936558eb4a3f63aab7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b6335b63452e29e35db74964b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b7423cc1117c15104daec4346"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c302178e0f3483a9fc535bd21b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e36689e9fa9ee4a76542e12017"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3fb2c7d8802c2ca54b53020e04"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1e52a4cae3da00380d2665d4b"`,
    );

    // Messages 테이블 인덱스 삭제
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3f7cfa28b3ec132c53b48114b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b3c4f4471f43b1a17771ae579"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b6f42dcafbc76eb6f4f8bc5c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfe166ccdd53722597a90f6324"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4840fed5ef9baa08c4c314503"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_67588f76828ebebd2bfe971afd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_706eed08cb5e027fe5e9fcb9a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29184560395328217ac21a8ea6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50e74137f3a0ca84a100130f3f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0262e5d715a726bdaefe6340e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5af59aa83a3b266bb35c0b5573"`,
    );

    // Planets 테이블 인덱스 삭제
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36d9c08ea0fc09772a29855277"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68de525d0258210981bb4f6408"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_788648558c18fba1e3806d7b9a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6de171d8cbf6c3b97270273142"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eee212e33743a60f811a333c19"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cc1cac38c163a79396bbe9d859"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_72cb259a83425cb3683f0577b5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24a3e4bf7aabe83d7979796c75"`,
    );

    // Travels 테이블 인덱스 삭제
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4fb0a4e891a5be7dd4b3cbb7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd3938a1923f9c141a64c6ecb6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4aae6d1c93e593cb1f0aab1efa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0f6bb380e067912ecc66cdd5f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b6d1a848b08eb3295654d72b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2133ee47bddbababf8be3b32cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db62f526a964878cf88774366e"`,
    );

    // Users 테이블 인덱스 삭제
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b91ab6d821bbe820b09753a151"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fe9fad8d1971b7fded468011a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e179ff3144072962c9664df09"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d5efa4db71a540f016110b32d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96056fe8ab8748b090b8419ad3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_836026b660a661f0dbdc467bf1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`,
    );
  }
}
