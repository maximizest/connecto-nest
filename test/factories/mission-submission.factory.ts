import { Factory } from 'fishery';
import { MissionSubmission } from '../../src/modules/mission-submission/mission-submission.entity';
import { MissionType } from '../../src/modules/mission/enums/mission-type.enum';
import { SubmissionStatus } from '../../src/modules/mission/enums/submission-status.enum';

/**
 * MissionSubmission Factory - Fishery를 사용한 미션 제출 테스트 데이터 생성
 */
export const MissionSubmissionFactory = Factory.define<MissionSubmission>(({ sequence, params }) => {
  const submission = new MissionSubmission();

  // 기본 정보
  submission.id = sequence;
  submission.missionId = params.missionId || sequence;
  submission.userId = params.userId || sequence;
  submission.travelId = params.travelId || sequence;

  // 제출 정보
  submission.submissionType = MissionType.IMAGE;
  submission.submissionData = {
    fileUploadId: sequence,
    fileUrl: `https://cdn.example.com/submissions/${sequence}/image.jpg`,
    caption: '미션 완료했습니다!',
  };

  // 상태
  submission.status = SubmissionStatus.PENDING;
  submission.earnedPoints = 0;

  // 타임스탬프
  submission.createdAt = new Date();
  submission.updatedAt = new Date();

  return submission;
});

/**
 * 승인된 제출 Factory
 */
export const ApprovedSubmissionFactory = MissionSubmissionFactory.params({
  status: SubmissionStatus.APPROVED,
  earnedPoints: 150,
  reviewedAt: new Date(),
  reviewNote: '훌륭한 미션 수행입니다!',
});

/**
 * 거절된 제출 Factory
 */
export const RejectedSubmissionFactory = MissionSubmissionFactory.params({
  status: SubmissionStatus.REJECTED,
  earnedPoints: 0,
  reviewedAt: new Date(),
  reviewNote: '미션 요구사항을 충족하지 못했습니다.',
});

/**
 * 비디오 제출 Factory
 */
export const VideoSubmissionFactory = MissionSubmissionFactory.params({
  submissionType: MissionType.VIDEO,
  submissionData: {
    fileUploadId: 1,
    fileUrl: 'https://cdn.example.com/submissions/video.mp4',
    thumbnailUrl: 'https://cdn.example.com/submissions/thumbnail.jpg',
    duration: 45,
    caption: '비디오 미션 완료!',
  },
});

/**
 * 밸런스 게임 제출 Factory
 */
export const BalanceGameSubmissionFactory = MissionSubmissionFactory.params({
  submissionType: MissionType.BALANCE_GAME,
  submissionData: {
    answers: [
      { questionId: 1, selectedOption: 'A' },
      { questionId: 2, selectedOption: 'B' },
      { questionId: 3, selectedOption: 'A' },
    ],
    completedAt: new Date().toISOString(),
  },
});