import { addDays } from 'date-fns';
import { Factory } from 'fishery';
import { Travel } from '../../src/modules/travel/travel.entity';
import { TravelStatus } from '../../src/modules/travel/enums/travel-status.enum';
import { TravelVisibility } from '../../src/modules/travel/enums/travel-visibility.enum';

/**
 * Travel Factory - Fishery를 사용한 여행 테스트 데이터 생성
 */
export const TravelFactory = Factory.define<Travel>(({ sequence, params }) => {
  const travel = new Travel();

  // 기본 정보
  travel.id = sequence;
  travel.name = `테스트여행${sequence}`;
  travel.description = `테스트 여행 ${sequence}에 대한 설명입니다.`;
  travel.imageUrl = `https://example.com/travel/${sequence}/image.jpg`;

  // 숙박 정보
  travel.accommodationId = params.accommodationId || null;

  // 상태 관리
  travel.status = TravelStatus.INACTIVE;

  // 날짜 관리 (기본: 오늘부터 30일)
  travel.startDate = new Date();
  travel.endDate = addDays(new Date(), 30);

  // 접근 제어
  travel.visibility = TravelVisibility.PUBLIC;
  travel.inviteCode = `TRAVEL-${sequence}`;
  travel.inviteCodeEnabled = true;

  // 제한 설정
  travel.maxPlanets = 10;
  travel.maxGroupMembers = 100;

  // 통계 정보
  travel.memberCount = 1;
  travel.planetCount = 0;
  travel.totalMessages = 0;
  travel.lastActivityAt = null;

  // 설정
  travel.settings = {
    allowDirectPlanets: true,
    autoCreateGroupPlanet: false,
    requireApproval: false,
    allowFileUpload: true,
    timezone: 'Asia/Seoul',
    language: 'ko',
  };

  // 메타데이터
  travel.metadata = null;

  // 타임스탬프
  travel.createdAt = new Date();
  travel.updatedAt = new Date();

  return travel;
});

/**
 * 활성 여행 Factory
 */
export const ActiveTravelFactory = TravelFactory.params({
  status: TravelStatus.ACTIVE,
  lastActivityAt: new Date(),
});

/**
 * 비공개 여행 Factory
 */
export const PrivateTravelFactory = TravelFactory.params({
  visibility: TravelVisibility.PRIVATE,
  inviteCodeEnabled: false,
  settings: {
    allowDirectPlanets: false,
    autoCreateGroupPlanet: true,
    requireApproval: true,
    allowFileUpload: true,
    timezone: 'Asia/Seoul',
    language: 'ko',
  },
});

/**
 * 완료된 여행 Factory
 */
export const CompletedTravelFactory = TravelFactory.params({
  status: TravelStatus.COMPLETED,
  startDate: addDays(new Date(), -60),
  endDate: addDays(new Date(), -30),
});

/**
 * 취소된 여행 Factory
 */
export const CancelledTravelFactory = TravelFactory.params({
  status: TravelStatus.CANCELLED,
});

/**
 * 활발한 활동 여행 Factory
 */
export const BusyTravelFactory = TravelFactory.params({
  status: TravelStatus.ACTIVE,
  memberCount: 50,
  planetCount: 8,
  totalMessages: 5000,
  lastActivityAt: new Date(),
});

/**
 * 숙박 시설이 있는 여행 Factory
 */
export const TravelWithAccommodationFactory = TravelFactory.params({
  accommodationId: 1,
});
