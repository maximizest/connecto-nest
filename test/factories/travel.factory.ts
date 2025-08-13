import { addDays } from 'date-fns';
import { Factory } from 'fishery';
import {
  Travel,
  TravelStatus,
  TravelVisibility,
} from '../../src/modules/travel/travel.entity';

/**
 * Travel Factory - Fishery를 사용한 여행 테스트 데이터 생성
 * 주의: createdBy 필드는 별도로 설정해야 합니다
 */
export const TravelFactory = Factory.define<Travel>(({ sequence }) => {
  const travel = new Travel();

  // 기본 여행 정보
  travel.name = `테스트여행${sequence}`;
  travel.description = `테스트 여행 ${sequence}에 대한 설명입니다.`;
  travel.imageUrl = `https://example.com/travel/${sequence}/image.jpg`;

  // 소유자 (테스트에서 별도 설정 필요)
  // createdBy 필드 제거됨

  // 상태 관리
  travel.status = TravelStatus.INACTIVE;

  // 날짜 관리 (기본: 오늘부터 30일)
  travel.startDate = new Date();
  travel.endDate = addDays(new Date(), 30); // 여행 종료 날짜 (채팅 만료 날짜)

  // 접근 제어
  travel.visibility = TravelVisibility.PUBLIC;
  travel.inviteCode = undefined;
  travel.inviteCodeEnabled = true;

  // 제한 설정
  travel.maxPlanets = 10;
  travel.maxGroupMembers = 100;

  // 통계 정보
  travel.memberCount = 1; // 생성자 포함
  travel.planetCount = 0;
  travel.totalMessages = 0;
  travel.lastActivityAt = undefined;

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
  travel.metadata = undefined;

  // 타임스탬프
  travel.createdAt = new Date();
  travel.updatedAt = new Date();

  return travel;
});
