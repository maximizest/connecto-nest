import { Injectable, Logger } from '@nestjs/common';
import {
  Report,
  ReportContext,
  ReportStatus,
  ReportType,
} from './report.entity';
import { User } from '../user/user.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor() {}

  /**
   * 신고 접수
   */
  async createReport(
    reporterId: number,
    data: {
      reportedUserId: number;
      type: ReportType;
      context: ReportContext;
      description: string;
      travelId?: number;
      planetId?: number;
      messageId?: number;
      evidenceUrls?: string[];
      metadata?: Record<string, any>;
    },
  ): Promise<Report> {
    // 중복 신고 확인 - Active Record 패턴 사용
    const existingReports = await Report.find({
      where: {
        reporterId,
        reportedUserId: data.reportedUserId,
        status: ReportStatus.PENDING,
      },
    });

    const contextId = data.travelId || data.planetId || data.messageId;
    if (
      Report.isDuplicate(
        existingReports,
        reporterId,
        data.reportedUserId,
        data.context,
        contextId,
      )
    ) {
      throw new Error('이미 신고한 내용입니다. 처리 중이니 기다려주세요.');
    }

    // 자기 자신 신고 방지
    if (reporterId === data.reportedUserId) {
      throw new Error('자기 자신을 신고할 수 없습니다.');
    }

    // 신고 대상 사용자 확인 - Active Record 패턴 사용
    const reportedUser = await User.findOne({
      where: { id: data.reportedUserId },
    });

    if (!reportedUser) {
      throw new Error('신고 대상 사용자를 찾을 수 없습니다.');
    }

    // 신고 생성 - Active Record 패턴 사용
    const report = Report.create({
      reporterId,
      reportedUserId: data.reportedUserId,
      type: data.type,
      context: data.context,
      description: data.description,
      travelId: data.travelId || null,
      planetId: data.planetId || null,
      messageId: data.messageId || null,
      evidenceUrls: data.evidenceUrls || [],
      metadata: data.metadata || null,
      status: ReportStatus.PENDING,
    });

    const savedReport = await report.save();

    this.logger.log(
      `Report created: id=${savedReport.id}, reporter=${reporterId}, reported=${data.reportedUserId}, type=${data.type}`,
    );

    return savedReport;
  }

  /**
   * 신고 목록 조회 (본인이 신고한 내역)
   */
  async getMyReports(
    userId: number,
    options?: {
      status?: ReportStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ reports: Report[]; total: number }> {
    const query = Report.createQueryBuilder('report')
      .leftJoinAndSelect('report.reportedUser', 'reportedUser')
      .leftJoinAndSelect('report.travel', 'travel')
      .leftJoinAndSelect('report.planet', 'planet')
      .leftJoinAndSelect('report.message', 'message')
      .where('report.reporterId = :userId', { userId })
      .orderBy('report.createdAt', 'DESC');

    if (options?.status) {
      query.andWhere('report.status = :status', { status: options.status });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const [reports, total] = await query.getManyAndCount();

    return { reports, total };
  }

  /**
   * 특정 신고 조회 (본인이 신고한 것만)
   */
  async getReportById(
    reportId: number,
    userId: number,
  ): Promise<Report | null> {
    const report = await Report.findOne({
      where: {
        id: reportId,
        reporterId: userId,
      },
      relations: ['reportedUser', 'travel', 'planet', 'message'],
    });

    return report;
  }

  /**
   * 신고 취소 (PENDING 상태일 때만 가능)
   */
  async cancelReport(reportId: number, userId: number): Promise<void> {
    const report = await Report.findOne({
      where: {
        id: reportId,
        reporterId: userId,
        status: ReportStatus.PENDING,
      },
    });

    if (!report) {
      throw new Error('취소할 수 있는 신고를 찾을 수 없습니다.');
    }

    await report.remove();

    this.logger.log(`Report cancelled: id=${reportId}, reporter=${userId}`);
  }

  /**
   * Travel 내 신고 통계 조회
   */
  async getTravelReportStats(travelId: number): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    topReportedUsers: Array<{ userId: number; count: number }>;
  }> {
    const reports = await Report.find({
      where: { travelId },
    });

    const pendingReports = reports.filter(
      (r) => r.status === ReportStatus.PENDING,
    ).length;
    const resolvedReports = reports.filter(
      (r) => r.status === ReportStatus.RESOLVED,
    ).length;

    // 가장 많이 신고된 사용자 통계
    const userReportCounts = new Map<number, number>();
    reports.forEach((report) => {
      const count = userReportCounts.get(report.reportedUserId) || 0;
      userReportCounts.set(report.reportedUserId, count + 1);
    });

    const topReportedUsers = Array.from(userReportCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalReports: reports.length,
      pendingReports,
      resolvedReports,
      topReportedUsers,
    };
  }

  /**
   * Planet 내 신고 통계 조회
   */
  async getPlanetReportStats(planetId: number): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    reportsByType: Record<ReportType, number>;
  }> {
    const reports = await Report.find({
      where: { planetId },
    });

    const pendingReports = reports.filter(
      (r) => r.status === ReportStatus.PENDING,
    ).length;
    const resolvedReports = reports.filter(
      (r) => r.status === ReportStatus.RESOLVED,
    ).length;

    // 신고 유형별 통계
    const reportsByType = {} as Record<ReportType, number>;
    Object.values(ReportType).forEach((type) => {
      reportsByType[type] = reports.filter((r) => r.type === type).length;
    });

    return {
      totalReports: reports.length,
      pendingReports,
      resolvedReports,
      reportsByType,
    };
  }
}
