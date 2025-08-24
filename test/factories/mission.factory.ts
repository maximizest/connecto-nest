import { Factory } from 'fishery';
import { Mission } from '../../src/modules/mission/mission.entity';
import { MissionType } from '../../src/modules/mission/enums/mission-type.enum';
import { MissionTarget } from '../../src/modules/mission/enums/mission-target.enum';

/**
 * Mission Factory - Fishery를 사용한 미션 테스트 데이터 생성
 */
export const MissionFactory = Factory.define<Mission>(({ sequence }) => {
  const mission = new Mission();

  // 기본 정보
  mission.id = sequence;
  mission.type = MissionType.IMAGE;
  mission.target = MissionTarget.INDIVIDUAL;
  mission.title = `테스트 미션 ${sequence}`;
  mission.description = `미션 설명: 주어진 과제를 완료하세요.`;

  // 메타데이터
  mission.metadata = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
  };

  // 포인트
  mission.basePoints = 100;
  mission.bonusPoints = 50;

  // 미션 기간
  const now = new Date();
  mission.startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1일 전
  mission.endAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // 6일 후

  // 상태
  mission.active = true;

  // 타임스탬프
  mission.createdAt = new Date();
  mission.updatedAt = new Date();

  return mission;
});

/**
 * 비디오 미션 Factory
 */
export const VideoMissionFactory = MissionFactory.params({
  type: MissionType.VIDEO,
  metadata: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFormats: ['mp4', 'mov', 'avi'],
    maxDuration: 60, // 60초
  },
});

/**
 * 밸런스 게임 미션 Factory
 */
export const BalanceGameMissionFactory = MissionFactory.params({
  type: MissionType.BALANCE_GAME,
  metadata: {
    questions: [
      {
        question: '여름 vs 겨울',
        optionA: '여름',
        optionB: '겨울',
        order: 1,
      },
      {
        question: '산 vs 바다',
        optionA: '산',
        optionB: '바다',
        order: 2,
      },
      {
        question: '커피 vs 차',
        optionA: '커피',
        optionB: '차',
        order: 3,
      },
    ],
  },
});

/**
 * 단체 미션 Factory
 */
export const GroupMissionFactory = MissionFactory.params({
  target: MissionTarget.GROUP,
  basePoints: 200,
  bonusPoints: 100,
});

/**
 * 비활성 미션 Factory
 */
export const InactiveMissionFactory = MissionFactory.params({
  active: false,
});

/**
 * 종료된 미션 Factory
 */
export const ExpiredMissionFactory = MissionFactory.params({
  startAt: new Date('2024-01-01'),
  endAt: new Date('2024-01-31'),
});