import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 하드 삭제 구현을 위한 시스템 사용자 생성 마이그레이션
 *
 * 시스템 사용자:
 * - ID -1: 탈퇴한 사용자 (Deleted User)
 * - ID -2: 탈퇴한 관리자 (Deleted Admin)
 *
 * 이 시스템 사용자들은 개인정보 완전 삭제 후
 * 서비스 데이터(메시지, 관계 등)에서 참조용으로 사용됩니다.
 */
export class CreateSystemUsersForHardDelete1754956510383
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🏗️  Creating system users for hard delete compliance...');

    // 1. 시스템 사용자 (-1: 탈퇴한 사용자) 생성
    await queryRunner.query(`
      INSERT INTO "users" (
        "id",
        "socialId",
        "provider", 
        "name",
        "email",
        "avatar",
        "status",
        "isOnline",
        "isActive",
        "isBanned",
        "createdAt",
        "updatedAt"
      ) VALUES (
        -1,
        'system-deleted-user',
        'google',
        '탈퇴한 사용자',
        'deleted-user@system.local',
        NULL,
        'offline',
        false,
        false,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO NOTHING;
    `);

    // 2. 시스템 관리자 (-2: 탈퇴한 관리자) 생성
    await queryRunner.query(`
      INSERT INTO "admins" (
        "id",
        "name",
        "email",
        "password",
        "createdAt",
        "updatedAt"
      ) VALUES (
        -2,
        '탈퇴한 관리자',
        'deleted-admin@system.local',
        '$2b$10$invalidhashedpasswordfordeletedadmin',
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO NOTHING;
    `);

    // 3. 시스템 사용자 프로필 생성 (-1 사용자용)
    await queryRunner.query(`
      INSERT INTO "profiles" (
        "userId",
        "nickname",
        "name",
        "gender",
        "age",
        "occupation",
        "bio",
        "profileImageUrl",
        "settings"
      ) VALUES (
        -1,
        '탈퇴한 사용자',
        '탈퇴한 사용자',
        NULL,
        NULL,
        NULL,
        '이 사용자는 서비스에서 탈퇴했습니다.',
        NULL,
        '{"showAge": false, "showGender": false, "showOccupation": false}'
      )
      ON CONFLICT ("userId") DO NOTHING;
    `);

    // 4. ID 시퀀스 조정 (음수 ID를 생성했으므로)
    // PostgreSQL에서는 SERIAL 시퀀스가 음수 ID에 영향받지 않지만 명시적으로 확인
    await queryRunner.query(`
      SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users WHERE id > 0), 1), false);
    `);

    await queryRunner.query(`
      SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id)+1 FROM admins WHERE id > 0), 1), false);
    `);

    await queryRunner.query(`
      SELECT setval('profiles_id_seq', COALESCE((SELECT MAX(id)+1 FROM profiles WHERE id > 0), 1), false);
    `);

    console.log('✅ System users created successfully!');
    console.log('   - User ID -1: 탈퇴한 사용자');
    console.log('   - Admin ID -2: 탈퇴한 관리자');
    console.log('   - Profile for User -1 created');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🗑️  Rolling back system users...');

    // 시스템 사용자들 삭제 (역순)
    await queryRunner.query(`DELETE FROM "profiles" WHERE "userId" = -1;`);
    await queryRunner.query(`DELETE FROM "admins" WHERE "id" = -2;`);
    await queryRunner.query(`DELETE FROM "users" WHERE "id" = -1;`);

    console.log('✅ System users rollback completed');
  }
}
