import { Factory } from 'fishery';
import { PlanetUser } from '../../src/modules/planet-user/planet-user.entity';
import { PlanetUserStatus } from '../../src/modules/planet-user/enums/planet-user-status.enum';

/**
 * PlanetUser Factory - Fishery를 사용한 Planet 멤버십 테스트 데이터 생성
 */
export const PlanetUserFactory = Factory.define<PlanetUser>(({ sequence, params }) => {
  const planetUser = new PlanetUser();

  // 기본 정보
  planetUser.id = sequence;
  planetUser.planetId = params.planetId || sequence;
  planetUser.userId = params.userId || sequence;

  // 익명화 정보
  planetUser.isDeletedUser = false;
  planetUser.deletedUserName = null;

  // 멤버십 정보
  planetUser.status = PlanetUserStatus.ACTIVE;
  planetUser.role = 'PARTICIPANT';
  planetUser.joinedAt = new Date();

  // 설정
  planetUser.isMuted = false;
  planetUser.lastReadMessageId = null;
  planetUser.unreadCount = 0;

  // 타임스탬프
  planetUser.createdAt = new Date();
  planetUser.updatedAt = new Date();

  return planetUser;
});

/**
 * 호스트 멤버 Factory
 */
export const HostPlanetUserFactory = PlanetUserFactory.params({
  role: 'HOST',
});

/**
 * 모더레이터 멤버 Factory
 */
export const ModeratorPlanetUserFactory = PlanetUserFactory.params({
  role: 'MODERATOR',
});

/**
 * 음소거된 멤버 Factory
 */
export const MutedPlanetUserFactory = PlanetUserFactory.params({
  isMuted: true,
  mutedAt: new Date(),
  mutedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
});

/**
 * 나간 멤버 Factory
 */
export const LeftPlanetUserFactory = PlanetUserFactory.params({
  status: PlanetUserStatus.LEFT,
  leftAt: new Date(),
});

/**
 * 차단된 멤버 Factory
 */
export const BannedPlanetUserFactory = PlanetUserFactory.params({
  status: PlanetUserStatus.BANNED,
  bannedAt: new Date(),
  bannedReason: '규칙 위반',
});

/**
 * 익명화된 멤버 Factory
 */
export const DeletedUserPlanetUserFactory = PlanetUserFactory.params({
  userId: null,
  isDeletedUser: true,
  deletedUserName: '탈퇴한 사용자',
});