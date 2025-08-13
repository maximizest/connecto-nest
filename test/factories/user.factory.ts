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

  // 온라인 상태
  user.status = UserStatus.OFFLINE;

  // 설정
  user.notificationsEnabled = true;
  user.advertisingConsentEnabled = false;
  user.language = 'ko';
  user.timezone = 'Asia/Seoul';

  // 보안 정보
  user.refreshToken = undefined;

  // 계정 상태
  user.isBanned = false;

  // 메타데이터
  user.socialMetadata = undefined;

  // 타임스탬프
  user.createdAt = new Date();
  user.updatedAt = new Date();

  return user;
});
