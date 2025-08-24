import { Factory } from 'fishery';
import { Planet } from '../../src/modules/planet/planet.entity';
import { PlanetStatus } from '../../src/modules/planet/enums/planet-status.enum';
import { PlanetType } from '../../src/modules/planet/enums/planet-type.enum';

/**
 * Planet Factory - Fishery를 사용한 플래닛(채팅방) 테스트 데이터 생성
 */
export const PlanetFactory = Factory.define<Planet>(({ sequence, params }) => {
  const planet = new Planet();

  // 기본 정보
  planet.id = sequence;
  planet.name = `테스트플래닛${sequence}`;
  planet.description = `테스트 플래닛 ${sequence}에 대한 설명입니다.`;
  planet.imageUrl = `https://example.com/planet/${sequence}/image.jpg`;

  // 타입 및 소속
  planet.type = PlanetType.GROUP;
  planet.travelId = params.travelId || sequence;

  // 상태 관리
  planet.status = PlanetStatus.ACTIVE;
  planet.isActive = true;

  // 시간 제한 설정
  planet.timeRestriction = null;

  // 멤버 관리
  planet.memberCount = 1;
  planet.maxMembers = 100;

  // 메시지 통계
  planet.messageCount = 0;
  planet.lastMessageAt = null;
  planet.lastMessagePreview = null;
  planet.lastMessageUserId = null;

  // Planet 설정
  planet.settings = {
    allowFileUpload: true,
    allowedFileTypes: ['jpg', 'png', 'pdf', 'txt', 'mp4', 'mov'],
    maxFileSize: 500 * 1024 * 1024, // 500MB
    readReceiptsEnabled: true,
    typingIndicatorsEnabled: true,
    notificationsEnabled: true,
  };

  // 1:1 채팅 전용 필드
  planet.partnerId = null;

  // 메타데이터
  planet.metadata = null;

  // 타임스탬프
  planet.createdAt = new Date();
  planet.updatedAt = new Date();

  return planet;
});

/**
 * 1:1 다이렉트 메시지 Planet Factory
 */
export const DirectMessagePlanetFactory = PlanetFactory.params({
  type: PlanetType.DIRECT,
  name: '다이렉트 메시지',
  description: null,
  maxMembers: 2,
  partnerId: 2,
});

/**
 * 비활성 Planet Factory
 */
export const InactivePlanetFactory = PlanetFactory.params({
  status: PlanetStatus.INACTIVE,
  isActive: false,
});

/**
 * 아카이브된 Planet Factory
 */
export const ArchivedPlanetFactory = PlanetFactory.params({
  status: PlanetStatus.ARCHIVED,
  isActive: false,
});

/**
 * 시간 제한이 있는 Planet Factory
 */
export const TimeRestrictedPlanetFactory = PlanetFactory.params({
  timeRestriction: {
    type: 'DAILY',
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'Asia/Seoul',
    daysOfWeek: [1, 2, 3, 4, 5], // 월-금
  },
});

/**
 * 최대 인원 Planet Factory
 */
export const FullPlanetFactory = PlanetFactory.params({
  memberCount: 100,
  maxMembers: 100,
});

/**
 * 활발한 활동 Planet Factory
 */
export const ActiveChatPlanetFactory = PlanetFactory.params({
  messageCount: 1000,
  lastMessageAt: new Date(),
  lastMessagePreview: '최근 메시지 내용입니다.',
  lastMessageUserId: 1,
});
