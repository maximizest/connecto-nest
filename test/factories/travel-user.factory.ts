import { Factory } from 'fishery';
import { TravelUser } from '../../src/modules/travel-user/travel-user.entity';
import { TravelUserRole } from '../../src/modules/travel-user/enums/travel-user-role.enum';
import { TravelUserStatus } from '../../src/modules/travel-user/enums/travel-user-status.enum';

/**
 * TravelUser Factory - Fishery를 사용한 여행 멤버십 테스트 데이터 생성
 */
export const TravelUserFactory = Factory.define<TravelUser>(({ sequence, params }) => {
  const travelUser = new TravelUser();

  // 기본 정보
  travelUser.id = sequence;
  travelUser.travelId = params.travelId || sequence;
  travelUser.userId = params.userId || sequence;

  // 멤버십 정보
  travelUser.role = TravelUserRole.PARTICIPANT;
  travelUser.status = TravelUserStatus.ACTIVE;
  travelUser.joinedAt = new Date();

  // 초대 정보
  travelUser.invitedBy = params.invitedBy || null;
  travelUser.inviteCode = `INVITE-${sequence}`;

  // 설정
  travelUser.nickname = `여행자${sequence}`;
  travelUser.profileColor = '#3498db';
  travelUser.notificationsEnabled = true;

  // 타임스탬프
  travelUser.createdAt = new Date();
  travelUser.updatedAt = new Date();

  return travelUser;
});

/**
 * 호스트 멤버 Factory
 */
export const HostTravelUserFactory = TravelUserFactory.params({
  role: TravelUserRole.HOST,
  invitedBy: null,
});

/**
 * 대기중인 멤버 Factory
 */
export const PendingTravelUserFactory = TravelUserFactory.params({
  status: TravelUserStatus.PENDING,
  joinedAt: null,
});

/**
 * 나간 멤버 Factory
 */
export const LeftTravelUserFactory = TravelUserFactory.params({
  status: TravelUserStatus.LEFT,
  leftAt: new Date(),
  leftReason: '개인 사정',
});

/**
 * 알림 비활성화 멤버 Factory
 */
export const MutedTravelUserFactory = TravelUserFactory.params({
  notificationsEnabled: false,
});

/**
 * 커스텀 프로필 멤버 Factory
 */
export const CustomizedTravelUserFactory = TravelUserFactory.params({
  nickname: '특별한 여행자',
  profileColor: '#e74c3c',
  profileEmoji: '✈️',
});