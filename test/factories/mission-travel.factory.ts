import { Factory } from 'fishery';
import { MissionTravel } from '../../src/modules/mission-travel/mission-travel.entity';

/**
 * MissionTravel Factory - Fishery를 사용한 미션-여행 연결 테스트 데이터 생성
 */
export const MissionTravelFactory = Factory.define<MissionTravel>(({ sequence, params }) => {
  const missionTravel = new MissionTravel();

  // 기본 정보
  missionTravel.id = sequence;
  missionTravel.missionId = params.missionId || sequence;
  missionTravel.travelId = params.travelId || sequence;

  // 상태
  missionTravel.active = true;
  missionTravel.priority = 1;

  // 타임스탬프
  missionTravel.createdAt = new Date();
  missionTravel.updatedAt = new Date();

  return missionTravel;
});

/**
 * 비활성 미션-여행 Factory
 */
export const InactiveMissionTravelFactory = MissionTravelFactory.params({
  active: false,
});

/**
 * 높은 우선순위 미션-여행 Factory
 */
export const HighPriorityMissionTravelFactory = MissionTravelFactory.params({
  priority: 10,
});