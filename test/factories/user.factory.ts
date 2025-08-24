import { Factory } from 'fishery';
import { User } from '../../src/modules/user/user.entity';
import { SocialProvider } from '../../src/modules/user/enums/social-provider.enum';
import { UserRole } from '../../src/modules/user/enums/user-role.enum';

/**
 * User Factory - Fishery를 사용한 사용자 테스트 데이터 생성
 */
export const UserFactory = Factory.define<User>(({ sequence }) => {
  const user = new User();

  // 기본 정보
  user.id = sequence;

  // 소셜 로그인 정보 (필수)
  user.socialId = `test_social_id_${sequence}`;
  user.provider = SocialProvider.GOOGLE;

  // 기본 사용자 정보
  user.name = `테스트유저${sequence}`;
  user.email = `test-user-${sequence}@example.com`;
  user.role = UserRole.USER;

  // 설정
  user.notificationsEnabled = true;
  user.advertisingConsentEnabled = false;
  user.language = 'ko';
  user.timezone = 'Asia/Seoul';

  // 보안 정보
  user.refreshToken = null;

  // 계정 상태
  user.isBanned = false;
  user.bannedAt = null;
  user.bannedReason = null;

  // 온라인 상태
  user.isOnline = false;
  user.lastSeenAt = new Date();

  // 메타데이터
  user.socialMetadata = null;

  // 타임스탬프
  user.createdAt = new Date();
  user.updatedAt = new Date();

  return user;
});

/**
 * 관리자 사용자 Factory
 */
export const AdminUserFactory = UserFactory.params({
  role: UserRole.ADMIN,
  email: 'admin@example.com',
});

/**
 * Apple 로그인 사용자 Factory
 */
export const AppleUserFactory = UserFactory.params({
  provider: SocialProvider.APPLE,
  socialId: 'apple_user_id',
});

/**
 * Kakao 로그인 사용자 Factory
 */
export const KakaoUserFactory = UserFactory.params({
  provider: SocialProvider.KAKAO,
  socialId: 'kakao_user_id',
});

/**
 * Naver 로그인 사용자 Factory
 */
export const NaverUserFactory = UserFactory.params({
  provider: SocialProvider.NAVER,
  socialId: 'naver_user_id',
});

/**
 * 차단된 사용자 Factory
 */
export const BannedUserFactory = UserFactory.params({
  isBanned: true,
  bannedAt: new Date(),
  bannedReason: '커뮤니티 가이드라인 위반',
});

/**
 * 온라인 사용자 Factory
 */
export const OnlineUserFactory = UserFactory.params({
  isOnline: true,
  lastSeenAt: new Date(),
});

/**
 * 알림 비활성화 사용자 Factory
 */
export const NotificationDisabledUserFactory = UserFactory.params({
  notificationsEnabled: false,
  advertisingConsentEnabled: false,
});
