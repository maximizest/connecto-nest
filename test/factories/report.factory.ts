import { Factory } from 'fishery';
import { Report } from '../../src/modules/report/report.entity';

/**
 * Report Factory - Fishery를 사용한 신고 테스트 데이터 생성
 */
export const ReportFactory = Factory.define<Report>(({ sequence, params }) => {
  const report = new Report();

  // 기본 정보
  report.id = sequence;
  report.reporterId = params.reporterId || sequence;
  report.reportedUserId = params.reportedUserId || (sequence + 100);

  // 신고 내용
  report.targetType = 'message';
  report.targetId = params.targetId || sequence;
  report.reason = 'inappropriate_content';
  report.description = '부적절한 내용이 포함되어 있습니다.';

  // 관계 정보
  report.planetId = params.planetId || sequence;
  report.travelId = params.travelId || sequence;

  // 처리 상태
  report.status = 'pending';
  report.reviewedAt = null;
  report.reviewedBy = null;
  report.reviewNote = null;
  report.actionTaken = null;

  // 타임스탬프
  report.createdAt = new Date();
  report.updatedAt = new Date();

  return report;
});

/**
 * 사용자 신고 Factory
 */
export const UserReportFactory = ReportFactory.params({
  targetType: 'user',
  reason: 'harassment',
  description: '다른 사용자를 괴롭히는 행동을 했습니다.',
});

/**
 * 메시지 신고 Factory
 */
export const MessageReportFactory = ReportFactory.params({
  targetType: 'message',
  reason: 'spam',
  description: '스팸 메시지를 반복적으로 보냈습니다.',
});

/**
 * Planet 신고 Factory
 */
export const PlanetReportFactory = ReportFactory.params({
  targetType: 'planet',
  reason: 'inappropriate_name',
  description: '부적절한 이름의 채팅방입니다.',
});

/**
 * 처리된 신고 Factory
 */
export const ReviewedReportFactory = ReportFactory.params({
  status: 'resolved',
  reviewedAt: new Date(),
  reviewedBy: 1,
  reviewNote: '경고 조치를 취했습니다.',
  actionTaken: 'warning_issued',
});

/**
 * 거절된 신고 Factory
 */
export const RejectedReportFactory = ReportFactory.params({
  status: 'rejected',
  reviewedAt: new Date(),
  reviewedBy: 1,
  reviewNote: '신고 내용이 사실과 다릅니다.',
  actionTaken: 'no_action',
});

/**
 * 보류된 신고 Factory
 */
export const OnHoldReportFactory = ReportFactory.params({
  status: 'on_hold',
  reviewNote: '추가 조사가 필요합니다.',
});