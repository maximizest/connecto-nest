import { Factory } from 'fishery';
import {
  SocialProvider,
  User,
  UserStatus,
} from '../../src/modules/user/user.entity';

/**
 * User Factory - Fishery를 사용한 사용자 테스트 데이터 생성
 */
export const UserFactory = Factory.define<User>(({ sequence }) => {
  const user = new User();

  // 소셜 로그인 정보 (필수)
  user.socialId = `test_social_id_${sequence}`;
  user.provider = SocialProvider.GOOGLE;

  // 기본 사용자 정보
  user.name = `테스트유저${sequence}`;
  user.email = `test-user-${sequence}@example.com`;

  // 프로필 정보
  user.avatar = `https://example.com/avatar/${sequence}.jpg`;

  // 온라인 상태
  user.status = UserStatus.OFFLINE;
  user.isOnline = false;
  user.lastSeenAt = new Date();

  // 설정
  user.notificationsEnabled = true;
  user.language = 'ko';
  user.timezone = 'Asia/Seoul';

  // 보안 정보
  user.refreshToken = undefined;
  user.refreshTokenExpiresAt = undefined;

  // 계정 상태
  user.isActive = true;
  user.isBanned = false;
  user.banExpiresAt = undefined;

  // 통계 정보
  user.loginCount = 0;
  user.firstLoginAt = undefined;

  // 메타데이터
  user.socialMetadata = undefined;

  // 타임스탬프
  user.createdAt = new Date();
  user.updatedAt = new Date();

  return user;
});
