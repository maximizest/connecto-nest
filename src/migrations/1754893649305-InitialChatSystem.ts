import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialChatSystem1754893649305 implements MigrationInterface {
  name = 'InitialChatSystem1754893649305';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admins" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(200) NOT NULL, "password" character varying(255) NOT NULL, "refreshToken" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_provider_enum" AS ENUM('google', 'apple')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('online', 'offline', 'away', 'busy')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "socialId" character varying(255) NOT NULL, "provider" "public"."users_provider_enum" NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(200) NOT NULL, "avatar" text, "status" "public"."users_status_enum" NOT NULL DEFAULT 'offline', "isOnline" boolean NOT NULL DEFAULT false, "lastSeenAt" TIMESTAMP, "notificationsEnabled" boolean NOT NULL DEFAULT false, "language" character varying(10) NOT NULL DEFAULT 'ko', "timezone" character varying(50) NOT NULL DEFAULT 'Asia/Seoul', "refreshToken" character varying(255), "refreshTokenExpiresAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "isBanned" boolean NOT NULL DEFAULT false, "banExpiresAt" TIMESTAMP, "loginCount" integer NOT NULL DEFAULT '0', "firstLoginAt" TIMESTAMP, "socialMetadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")); COMMENT ON COLUMN "users"."socialId" IS '소셜 로그인 고유 ID'; COMMENT ON COLUMN "users"."provider" IS '소셜 로그인 제공자 (Google, Apple)'; COMMENT ON COLUMN "users"."name" IS '사용자 이름'; COMMENT ON COLUMN "users"."email" IS '이메일 주소'; COMMENT ON COLUMN "users"."avatar" IS '프로필 이미지 URL'; COMMENT ON COLUMN "users"."status" IS '사용자 온라인 상태'; COMMENT ON COLUMN "users"."isOnline" IS '현재 온라인 여부 (실시간)'; COMMENT ON COLUMN "users"."lastSeenAt" IS '마지막 접속 시간'; COMMENT ON COLUMN "users"."notificationsEnabled" IS '알림 수신 여부'; COMMENT ON COLUMN "users"."language" IS '언어 설정'; COMMENT ON COLUMN "users"."timezone" IS '시간대 설정'; COMMENT ON COLUMN "users"."refreshToken" IS 'Refresh Token'; COMMENT ON COLUMN "users"."refreshTokenExpiresAt" IS 'Refresh Token 만료 시간'; COMMENT ON COLUMN "users"."isActive" IS '계정 활성화 여부'; COMMENT ON COLUMN "users"."isBanned" IS '계정 정지 여부'; COMMENT ON COLUMN "users"."banExpiresAt" IS '정지 해제 시간'; COMMENT ON COLUMN "users"."loginCount" IS '로그인 횟수'; COMMENT ON COLUMN "users"."firstLoginAt" IS '첫 로그인 시간'; COMMENT ON COLUMN "users"."socialMetadata" IS '소셜 로그인 추가 정보 (JSON)'; COMMENT ON COLUMN "users"."createdAt" IS '계정 생성 시간'; COMMENT ON COLUMN "users"."updatedAt" IS '정보 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2025eaefc4e1b443c84f6ca9b2" ON "users" ("socialId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c75e77b20aed2d8633d83dc767" ON "users" ("isOnline") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0e1a27f5119514e54547f02c8" ON "users" ("lastSeenAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_df40ea35845296666f010e5d60" ON "users" ("socialId", "provider") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travels_status_enum" AS ENUM('planning', 'active', 'completed', 'cancelled', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travels_visibility_enum" AS ENUM('public', 'private', 'invite_only')`,
    );
    await queryRunner.query(
      `CREATE TABLE "travels" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text, "imageUrl" text, "createdBy" integer NOT NULL, "status" "public"."travels_status_enum" NOT NULL DEFAULT 'planning', "isActive" boolean NOT NULL DEFAULT true, "startDate" TIMESTAMP, "endDate" TIMESTAMP, "expiryDate" TIMESTAMP NOT NULL, "visibility" "public"."travels_visibility_enum" NOT NULL DEFAULT 'invite_only', "inviteCode" character varying(20), "inviteCodeEnabled" boolean NOT NULL DEFAULT true, "maxPlanets" integer NOT NULL DEFAULT '10', "maxGroupMembers" integer NOT NULL DEFAULT '100', "memberCount" integer NOT NULL DEFAULT '0', "planetCount" integer NOT NULL DEFAULT '0', "totalMessages" integer NOT NULL DEFAULT '0', "lastActivityAt" TIMESTAMP, "settings" json, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_428300708b878e464fcbfcccd2f" UNIQUE ("inviteCode"), CONSTRAINT "PK_cc2d44f93ba8f6b268978971e2b" PRIMARY KEY ("id")); COMMENT ON COLUMN "travels"."name" IS '여행 이름'; COMMENT ON COLUMN "travels"."description" IS '여행 설명'; COMMENT ON COLUMN "travels"."imageUrl" IS '여행 이미지 URL'; COMMENT ON COLUMN "travels"."createdBy" IS '여행 생성자 ID'; COMMENT ON COLUMN "travels"."status" IS '여행 상태'; COMMENT ON COLUMN "travels"."isActive" IS '활성 상태'; COMMENT ON COLUMN "travels"."startDate" IS '여행 시작 예정 날짜'; COMMENT ON COLUMN "travels"."endDate" IS '여행 종료 예정 날짜'; COMMENT ON COLUMN "travels"."expiryDate" IS '채팅 만료 날짜 (이후 채팅 불가)'; COMMENT ON COLUMN "travels"."visibility" IS '공개 설정'; COMMENT ON COLUMN "travels"."inviteCode" IS '초대 코드 (공유용)'; COMMENT ON COLUMN "travels"."inviteCodeEnabled" IS '초대 코드 활성화 여부'; COMMENT ON COLUMN "travels"."maxPlanets" IS '최대 Planet 개수'; COMMENT ON COLUMN "travels"."maxGroupMembers" IS '그룹 Planet 최대 멤버 수'; COMMENT ON COLUMN "travels"."memberCount" IS '현재 멤버 수'; COMMENT ON COLUMN "travels"."planetCount" IS '현재 Planet 수'; COMMENT ON COLUMN "travels"."totalMessages" IS '총 메시지 수'; COMMENT ON COLUMN "travels"."lastActivityAt" IS '마지막 활동 시간'; COMMENT ON COLUMN "travels"."settings" IS 'Travel 세부 설정 (JSON)'; COMMENT ON COLUMN "travels"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "travels"."createdAt" IS '여행 생성 시간'; COMMENT ON COLUMN "travels"."updatedAt" IS '여행 정보 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6749e5c85f0c4c389188bc670d" ON "travels" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23e6daba79c39cfeabbe392c24" ON "travels" ("expiryDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_428300708b878e464fcbfcccd2" ON "travels" ("inviteCode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fe038bd7626c36eee32e4379c" ON "travels" ("visibility") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aab47f49c5905c4ec321b1e40f" ON "travels" ("createdBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d00c3d134d3e58ae1315ad3073" ON "travels" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_type_enum" AS ENUM('group', 'direct')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planets_status_enum" AS ENUM('active', 'inactive', 'archived', 'blocked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "planets" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" text, "imageUrl" text, "type" "public"."planets_type_enum" NOT NULL, "travelId" integer NOT NULL, "createdBy" integer NOT NULL, "status" "public"."planets_status_enum" NOT NULL DEFAULT 'active', "isActive" boolean NOT NULL DEFAULT true, "timeRestriction" json, "memberCount" integer NOT NULL DEFAULT '0', "maxMembers" integer NOT NULL DEFAULT '100', "messageCount" integer NOT NULL DEFAULT '0', "lastMessageAt" TIMESTAMP, "lastMessagePreview" character varying(200), "lastMessageUserId" integer, "settings" json, "partnerId" integer, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d5fbc2513a6d4909fe31938b0fd" PRIMARY KEY ("id")); COMMENT ON COLUMN "planets"."name" IS 'Planet 이름'; COMMENT ON COLUMN "planets"."description" IS 'Planet 설명'; COMMENT ON COLUMN "planets"."imageUrl" IS 'Planet 아이콘 또는 이미지 URL'; COMMENT ON COLUMN "planets"."type" IS 'Planet 타입 (단체/1:1)'; COMMENT ON COLUMN "planets"."travelId" IS '소속 Travel ID'; COMMENT ON COLUMN "planets"."createdBy" IS 'Planet 생성자 ID'; COMMENT ON COLUMN "planets"."status" IS 'Planet 상태'; COMMENT ON COLUMN "planets"."isActive" IS '활성 상태'; COMMENT ON COLUMN "planets"."timeRestriction" IS '시간 제한 설정 (JSON)'; COMMENT ON COLUMN "planets"."memberCount" IS '현재 멤버 수'; COMMENT ON COLUMN "planets"."maxMembers" IS '최대 멤버 수'; COMMENT ON COLUMN "planets"."messageCount" IS '총 메시지 수'; COMMENT ON COLUMN "planets"."lastMessageAt" IS '마지막 메시지 시간'; COMMENT ON COLUMN "planets"."lastMessagePreview" IS '마지막 메시지 내용 (미리보기용)'; COMMENT ON COLUMN "planets"."lastMessageUserId" IS '마지막 메시지 보낸 사용자 ID'; COMMENT ON COLUMN "planets"."settings" IS 'Planet 세부 설정 (JSON)'; COMMENT ON COLUMN "planets"."partnerId" IS '1:1 채팅 상대방 ID (DIRECT 타입 전용)'; COMMENT ON COLUMN "planets"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "planets"."createdAt" IS 'Planet 생성 시간'; COMMENT ON COLUMN "planets"."updatedAt" IS 'Planet 정보 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_16fe0bd3b41a5966b4255b75f4" ON "planets" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e417f6ed6c57fa9cfdf0f376c0" ON "planets" ("travelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b13da0eaf6dd939079539f2b65" ON "planets" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a0d637e2260b129070b2f4eec" ON "planets" ("lastMessageAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee8cf285073ffc55c4e1185cd1" ON "planets" ("partnerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f019dabaf3859fab20e1da9c8b" ON "planets" ("travelId", "type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4aa241d18d17e7227088d5bde" ON "planets" ("createdBy") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4d118e0ce2d8b41fb1eb057ab8" ON "planets" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'video', 'file', 'system')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read', 'failed', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" SERIAL NOT NULL, "type" "public"."messages_type_enum" NOT NULL, "planetId" integer NOT NULL, "senderId" integer NOT NULL, "content" text, "fileMetadata" json, "systemMetadata" json, "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent', "isDeleted" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "deletedBy" integer, "isEdited" boolean NOT NULL DEFAULT false, "editedAt" TIMESTAMP, "originalContent" text, "replyToMessageId" integer, "replyCount" integer NOT NULL DEFAULT '0', "readCount" integer NOT NULL DEFAULT '0', "firstReadAt" TIMESTAMP, "reactions" json, "searchableText" text, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id")); COMMENT ON COLUMN "messages"."type" IS '메시지 타입'; COMMENT ON COLUMN "messages"."planetId" IS '소속 Planet ID'; COMMENT ON COLUMN "messages"."senderId" IS '메시지 발신자 ID'; COMMENT ON COLUMN "messages"."content" IS '메시지 내용 (텍스트)'; COMMENT ON COLUMN "messages"."fileMetadata" IS '파일 메타데이터 (JSON)'; COMMENT ON COLUMN "messages"."systemMetadata" IS '시스템 메시지 메타데이터 (JSON)'; COMMENT ON COLUMN "messages"."status" IS '메시지 상태'; COMMENT ON COLUMN "messages"."isDeleted" IS '삭제 여부 (소프트 삭제)'; COMMENT ON COLUMN "messages"."deletedAt" IS '삭제 시간'; COMMENT ON COLUMN "messages"."deletedBy" IS '삭제한 사용자 ID'; COMMENT ON COLUMN "messages"."isEdited" IS '편집 여부'; COMMENT ON COLUMN "messages"."editedAt" IS '마지막 편집 시간'; COMMENT ON COLUMN "messages"."originalContent" IS '편집 전 원본 내용'; COMMENT ON COLUMN "messages"."replyToMessageId" IS '답장 대상 메시지 ID'; COMMENT ON COLUMN "messages"."replyCount" IS '답장 메시지 개수'; COMMENT ON COLUMN "messages"."readCount" IS '읽음 확인한 사용자 수'; COMMENT ON COLUMN "messages"."firstReadAt" IS '첫 읽음 시간'; COMMENT ON COLUMN "messages"."reactions" IS '메시지 반응 정보 (JSON)'; COMMENT ON COLUMN "messages"."searchableText" IS '검색용 텍스트 (인덱싱용)'; COMMENT ON COLUMN "messages"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "messages"."createdAt" IS '메시지 전송 시간'; COMMENT ON COLUMN "messages"."updatedAt" IS '메시지 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87183e91f31c528f4abc1cdc51" ON "messages" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c525b7857818c79931d5875d88" ON "messages" ("planetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2db9cf2b3ca111742793f6c37c" ON "messages" ("senderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f84c237b7406e33771839742c" ON "messages" ("isDeleted") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e18c5bd9344f845152f61f5c5" ON "messages" ("replyToMessageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ce6acdb0801254590f8a78c08" ON "messages" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_40dc3de52ed041e48cfb116f2a" ON "messages" ("senderId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aedeb5ba7b4beb916caf3704fd" ON "messages" ("planetId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_befd307485dbf0559d17e4a4d2" ON "messages" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_role_enum" AS ENUM('participant', 'creator', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."planet_users_status_enum" AS ENUM('active', 'left', 'banned', 'invited', 'muted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "planet_users" ("id" SERIAL NOT NULL, "planetId" integer NOT NULL, "userId" integer NOT NULL, "role" "public"."planet_users_role_enum" NOT NULL DEFAULT 'participant', "status" "public"."planet_users_status_enum" NOT NULL DEFAULT 'active', "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastSeenAt" TIMESTAMP, "leftAt" TIMESTAMP, "invitedBy" integer, "invitedAt" TIMESTAMP, "respondedAt" TIMESTAMP, "lastReadMessageId" integer, "lastReadAt" TIMESTAMP, "unreadCount" integer NOT NULL DEFAULT '0', "notificationsEnabled" boolean NOT NULL DEFAULT true, "isMuted" boolean NOT NULL DEFAULT false, "muteUntil" TIMESTAMP, "isBanned" boolean NOT NULL DEFAULT false, "bannedAt" TIMESTAMP, "banExpiresAt" TIMESTAMP, "bannedBy" integer, "banReason" text, "permissions" json, "personalSettings" json, "messageCount" integer NOT NULL DEFAULT '0', "fileCount" integer NOT NULL DEFAULT '0', "firstMessageAt" TIMESTAMP, "lastMessageAt" TIMESTAMP, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7bfe37092ce6937249a233f2f82" UNIQUE ("planetId", "userId"), CONSTRAINT "PK_acf6c79aaef79afacbd248d90d4" PRIMARY KEY ("id")); COMMENT ON COLUMN "planet_users"."planetId" IS 'Planet ID'; COMMENT ON COLUMN "planet_users"."userId" IS '사용자 ID'; COMMENT ON COLUMN "planet_users"."role" IS 'Planet 내 역할'; COMMENT ON COLUMN "planet_users"."status" IS '참여 상태'; COMMENT ON COLUMN "planet_users"."joinedAt" IS '참여 날짜'; COMMENT ON COLUMN "planet_users"."lastSeenAt" IS '마지막 접속 시간'; COMMENT ON COLUMN "planet_users"."leftAt" IS '탈퇴 날짜'; COMMENT ON COLUMN "planet_users"."invitedBy" IS '초대한 사용자 ID'; COMMENT ON COLUMN "planet_users"."invitedAt" IS '초대 날짜'; COMMENT ON COLUMN "planet_users"."respondedAt" IS '초대 응답 날짜'; COMMENT ON COLUMN "planet_users"."lastReadMessageId" IS '마지막 읽은 메시지 ID'; COMMENT ON COLUMN "planet_users"."lastReadAt" IS '마지막 읽음 시간'; COMMENT ON COLUMN "planet_users"."unreadCount" IS '읽지 않은 메시지 수'; COMMENT ON COLUMN "planet_users"."notificationsEnabled" IS '알림 활성화 여부'; COMMENT ON COLUMN "planet_users"."isMuted" IS '음소거 상태'; COMMENT ON COLUMN "planet_users"."muteUntil" IS '음소거 해제 시간'; COMMENT ON COLUMN "planet_users"."isBanned" IS '정지 여부'; COMMENT ON COLUMN "planet_users"."bannedAt" IS '정지 시작 시간'; COMMENT ON COLUMN "planet_users"."banExpiresAt" IS '정지 해제 시간'; COMMENT ON COLUMN "planet_users"."bannedBy" IS '정지 처리한 관리자 ID'; COMMENT ON COLUMN "planet_users"."banReason" IS '정지 사유'; COMMENT ON COLUMN "planet_users"."permissions" IS 'Planet 내 개별 권한 설정 (JSON)'; COMMENT ON COLUMN "planet_users"."personalSettings" IS 'Planet별 개인 설정 (JSON)'; COMMENT ON COLUMN "planet_users"."messageCount" IS 'Planet에서 전송한 메시지 수'; COMMENT ON COLUMN "planet_users"."fileCount" IS '업로드한 파일 수'; COMMENT ON COLUMN "planet_users"."firstMessageAt" IS '첫 메시지 전송 시간'; COMMENT ON COLUMN "planet_users"."lastMessageAt" IS '마지막 메시지 전송 시간'; COMMENT ON COLUMN "planet_users"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "planet_users"."createdAt" IS '레코드 생성 시간'; COMMENT ON COLUMN "planet_users"."updatedAt" IS '레코드 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8bd8b9a9d3f9b29642fbcdf7f" ON "planet_users" ("planetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_818d0335cf3edc9c3abdee1972" ON "planet_users" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5fd7cb74394de10f7b106fd603" ON "planet_users" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_607736bbd033835dbc7021fcd5" ON "planet_users" ("joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75f9c367325d72ee720fb6959f" ON "planet_users" ("lastReadMessageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b695cd6a2251661385019f2ee4" ON "planet_users" ("planetId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33d45514d19073da22af67c3ac" ON "planet_users" ("role") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_role_enum" AS ENUM('member', 'admin', 'owner')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."travel_users_status_enum" AS ENUM('pending', 'active', 'left', 'banned', 'invited')`,
    );
    await queryRunner.query(
      `CREATE TABLE "travel_users" ("id" SERIAL NOT NULL, "travelId" integer NOT NULL, "userId" integer NOT NULL, "role" "public"."travel_users_role_enum" NOT NULL DEFAULT 'member', "status" "public"."travel_users_status_enum" NOT NULL DEFAULT 'active', "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), "lastSeenAt" TIMESTAMP, "leftAt" TIMESTAMP, "invitedBy" integer, "invitedAt" TIMESTAMP, "respondedAt" TIMESTAMP, "isBanned" boolean NOT NULL DEFAULT false, "bannedAt" TIMESTAMP, "banExpiresAt" TIMESTAMP, "bannedBy" integer, "banReason" text, "permissions" json, "settings" json, "messageCount" integer NOT NULL DEFAULT '0', "createdPlanetCount" integer NOT NULL DEFAULT '0', "inviteCount" integer NOT NULL DEFAULT '0', "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cb3fb6e2f9ba7cbfaa55243691d" UNIQUE ("travelId", "userId"), CONSTRAINT "PK_80cadee462ed211f7ec572962a9" PRIMARY KEY ("id")); COMMENT ON COLUMN "travel_users"."travelId" IS 'Travel ID'; COMMENT ON COLUMN "travel_users"."userId" IS '사용자 ID'; COMMENT ON COLUMN "travel_users"."role" IS 'Travel 내 역할'; COMMENT ON COLUMN "travel_users"."status" IS '참여 상태'; COMMENT ON COLUMN "travel_users"."joinedAt" IS '가입 날짜'; COMMENT ON COLUMN "travel_users"."lastSeenAt" IS '마지막 접속 시간'; COMMENT ON COLUMN "travel_users"."leftAt" IS '탈퇴 날짜'; COMMENT ON COLUMN "travel_users"."invitedBy" IS '초대한 사용자 ID'; COMMENT ON COLUMN "travel_users"."invitedAt" IS '초대 날짜'; COMMENT ON COLUMN "travel_users"."respondedAt" IS '초대 응답 날짜'; COMMENT ON COLUMN "travel_users"."isBanned" IS '정지 여부'; COMMENT ON COLUMN "travel_users"."bannedAt" IS '정지 시작 시간'; COMMENT ON COLUMN "travel_users"."banExpiresAt" IS '정지 해제 시간'; COMMENT ON COLUMN "travel_users"."bannedBy" IS '정지 처리한 관리자 ID'; COMMENT ON COLUMN "travel_users"."banReason" IS '정지 사유'; COMMENT ON COLUMN "travel_users"."permissions" IS '개별 권한 설정 (JSON)'; COMMENT ON COLUMN "travel_users"."settings" IS '사용자별 설정 (JSON)'; COMMENT ON COLUMN "travel_users"."messageCount" IS '전송한 메시지 수'; COMMENT ON COLUMN "travel_users"."createdPlanetCount" IS '생성한 Planet 수'; COMMENT ON COLUMN "travel_users"."inviteCount" IS '초대한 멤버 수'; COMMENT ON COLUMN "travel_users"."metadata" IS '추가 메타데이터 (JSON)'; COMMENT ON COLUMN "travel_users"."createdAt" IS '레코드 생성 시간'; COMMENT ON COLUMN "travel_users"."updatedAt" IS '레코드 수정 시간'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_845f9301a1c4734d013fcc5359" ON "travel_users" ("travelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e444d7fbe7d18cc67c3b4bcf4" ON "travel_users" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_421650c3f46b2c352dc132bff5" ON "travel_users" ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bcb71b8445a2a38d303f8a12d1" ON "travel_users" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b40a22538d14fd661faadbb0b3" ON "travel_users" ("joinedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6eed6909a64c018ad1b237890b" ON "travel_users" ("travelId", "role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b95562111431ed61ed2dd4ff9" ON "travel_users" ("travelId", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" ADD CONSTRAINT "FK_aab47f49c5905c4ec321b1e40f5" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ADD CONSTRAINT "FK_e417f6ed6c57fa9cfdf0f376c00" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ADD CONSTRAINT "FK_e4aa241d18d17e7227088d5bde5" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" ADD CONSTRAINT "FK_ee8cf285073ffc55c4e1185cd1a" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_c525b7857818c79931d5875d88e" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_4e18c5bd9344f845152f61f5c53" FOREIGN KEY ("replyToMessageId") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD CONSTRAINT "FK_d8bd8b9a9d3f9b29642fbcdf7fc" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" ADD CONSTRAINT "FK_5103d0c0e7e3c1ebcc2bbff514b" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_845f9301a1c4734d013fcc53590" FOREIGN KEY ("travelId") REFERENCES "travels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" ADD CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "query-result-cache"`);
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_e36689e9fa9ee4a76542e12017e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_5e444d7fbe7d18cc67c3b4bcf44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travel_users" DROP CONSTRAINT "FK_845f9301a1c4734d013fcc53590"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP CONSTRAINT "FK_5103d0c0e7e3c1ebcc2bbff514b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP CONSTRAINT "FK_818d0335cf3edc9c3abdee1972e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planet_users" DROP CONSTRAINT "FK_d8bd8b9a9d3f9b29642fbcdf7fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_4e18c5bd9344f845152f61f5c53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_c525b7857818c79931d5875d88e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" DROP CONSTRAINT "FK_ee8cf285073ffc55c4e1185cd1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" DROP CONSTRAINT "FK_e4aa241d18d17e7227088d5bde5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "planets" DROP CONSTRAINT "FK_e417f6ed6c57fa9cfdf0f376c00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "travels" DROP CONSTRAINT "FK_aab47f49c5905c4ec321b1e40f5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_845f9301a1c4734d013fcc5359"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e444d7fbe7d18cc67c3b4bcf4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_421650c3f46b2c352dc132bff5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bcb71b8445a2a38d303f8a12d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b40a22538d14fd661faadbb0b3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b95562111431ed61ed2dd4ff9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6eed6909a64c018ad1b237890b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b40a22538d14fd661faadbb0b3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bcb71b8445a2a38d303f8a12d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_421650c3f46b2c352dc132bff5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e444d7fbe7d18cc67c3b4bcf4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_845f9301a1c4734d013fcc5359"`,
    );
    await queryRunner.query(`DROP TABLE "travel_users"`);
    await queryRunner.query(`DROP TYPE "public"."travel_users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."travel_users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8bd8b9a9d3f9b29642fbcdf7f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_818d0335cf3edc9c3abdee1972"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5fd7cb74394de10f7b106fd603"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33d45514d19073da22af67c3ac"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_607736bbd033835dbc7021fcd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75f9c367325d72ee720fb6959f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b695cd6a2251661385019f2ee4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75f9c367325d72ee720fb6959f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_607736bbd033835dbc7021fcd5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5fd7cb74394de10f7b106fd603"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_818d0335cf3edc9c3abdee1972"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8bd8b9a9d3f9b29642fbcdf7f"`,
    );
    await queryRunner.query(`DROP TABLE "planet_users"`);
    await queryRunner.query(`DROP TYPE "public"."planet_users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."planet_users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c525b7857818c79931d5875d88"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2db9cf2b3ca111742793f6c37c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87183e91f31c528f4abc1cdc51"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_befd307485dbf0559d17e4a4d2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ce6acdb0801254590f8a78c08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aedeb5ba7b4beb916caf3704fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40dc3de52ed041e48cfb116f2a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f84c237b7406e33771839742c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ce6acdb0801254590f8a78c08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e18c5bd9344f845152f61f5c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f84c237b7406e33771839742c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2db9cf2b3ca111742793f6c37c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c525b7857818c79931d5875d88"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87183e91f31c528f4abc1cdc51"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_16fe0bd3b41a5966b4255b75f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e417f6ed6c57fa9cfdf0f376c0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4d118e0ce2d8b41fb1eb057ab8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b13da0eaf6dd939079539f2b65"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4aa241d18d17e7227088d5bde"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a0d637e2260b129070b2f4eec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f019dabaf3859fab20e1da9c8b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee8cf285073ffc55c4e1185cd1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a0d637e2260b129070b2f4eec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b13da0eaf6dd939079539f2b65"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e417f6ed6c57fa9cfdf0f376c0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_16fe0bd3b41a5966b4255b75f4"`,
    );
    await queryRunner.query(`DROP TABLE "planets"`);
    await queryRunner.query(`DROP TYPE "public"."planets_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."planets_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d00c3d134d3e58ae1315ad3073"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23e6daba79c39cfeabbe392c24"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aab47f49c5905c4ec321b1e40f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3fe038bd7626c36eee32e4379c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6749e5c85f0c4c389188bc670d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_428300708b878e464fcbfcccd2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23e6daba79c39cfeabbe392c24"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6749e5c85f0c4c389188bc670d"`,
    );
    await queryRunner.query(`DROP TABLE "travels"`);
    await queryRunner.query(`DROP TYPE "public"."travels_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."travels_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df40ea35845296666f010e5d60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c75e77b20aed2d8633d83dc767"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0e1a27f5119514e54547f02c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c75e77b20aed2d8633d83dc767"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2025eaefc4e1b443c84f6ca9b2"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
    await queryRunner.query(`DROP TABLE "admins"`);
  }
}
