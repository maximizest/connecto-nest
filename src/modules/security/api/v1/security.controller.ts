import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../../guards/admin.guard';
import { AuthGuard } from '../../../../guards/auth.guard';
import {
  AdminOnly,
  AuditLog,
  HighSecurity,
  RateLimit,
  SecurityLog,
} from '../../decorators/security.decorator';
import {
  SecurityEvent,
  SecurityEventStatus,
  SecurityEventType,
  SecurityRiskLevel,
} from '../../security.entity';
import { SecurityService } from '../../security.service';

interface BlockIpDto {
  ipAddress: string;
  reason: string;
  riskLevel: SecurityRiskLevel;
  durationHours?: number;
}

interface SecurityEventQueryDto {
  type?: SecurityEventType;
  riskLevel?: SecurityRiskLevel;
  userId?: number;
  ipAddress?: string;
  status?: SecurityEventStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * 보안 관리 API 컨트롤러
 *
 * @foryourdev/nestjs-crud 기반 보안 이벤트 CRUD와
 * 보안 관리 전용 기능을 제공합니다.
 */
@Controller({ path: 'security', version: '1' })
@Crud({
  entity: SecurityEvent,
  allowedFilters: [
    'type',
    'riskLevel',
    'status',
    'userId',
    'ipAddress',
    'resourceType',
    'resourceId',
    'createdAt',
  ],
  allowedParams: [
    'type',
    'riskLevel',
    'title',
    'description',
    'userId',
    'ipAddress',
    'userAgent',
    'requestUrl',
    'requestMethod',
    'resourceType',
    'resourceId',
    'metadata',
  ],
  allowedIncludes: [],
  only: ['index', 'show'],
  routes: {
    index: {
      allowedFilters: [
        'type',
        'riskLevel',
        'status',
        'userId',
        'ipAddress',
        'createdAt_gt',
        'createdAt_lt',
      ],
    },
    show: {
      allowedIncludes: [],
    },
  },
})
@UseGuards(AuthGuard)
@SecurityLog('security_api_access')
export class SecurityController {
  constructor(public readonly crudService: SecurityService) {}

  /**
   * 보안 이벤트 생성 전 전처리
   */
  @BeforeCreate()
  async preprocessCreateEvent(body: any, context: any) {
    // 보안 이벤트는 일반적으로 시스템에서 자동 생성되므로
    // 수동 생성은 제한적으로 허용
    body.status = body.status || SecurityEventStatus.DETECTED;
    body.metadata = body.metadata || {};
    body.metadata.createdBy = 'system';
    body.metadata.source = 'manual';

    return body;
  }

  /**
   * 보안 이벤트 업데이트 전 전처리
   */
  @BeforeUpdate()
  async preprocessUpdateEvent(body: any, context: any) {
    // 보안 이벤트는 상태 변경만 허용 (조사 완료, 해결됨 등)
    const allowedFields = ['status', 'metadata'];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        filteredBody[field] = body[field];
      }
    });

    return filteredBody;
  }

  /**
   * 보안 이벤트 조회
   */
  @Get('events')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 100, window: 60 })
  async getSecurityEvents(@Query() query: SecurityEventQueryDto): Promise<{
    events: SecurityEvent[];
    total: number;
    filters: any;
  }> {
    const filters: any = {};

    if (query.type) filters.type = query.type;
    if (query.riskLevel) filters.riskLevel = query.riskLevel;
    if (query.userId) filters.userId = parseInt(query.userId.toString());
    if (query.ipAddress) filters.ipAddress = query.ipAddress;
    if (query.status) filters.status = query.status;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    const events = await this.crudService.getSecurityEvents(
      filters,
      query.limit || 50,
    );

    return {
      events,
      total: events.length,
      filters,
    };
  }

  /**
   * 보안 통계 조회
   */
  @Get('stats')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 20, window: 60 })
  async getSecurityStats(@Query('days') days?: number): Promise<{
    summary: any;
    trends: any;
    topThreats: any;
    recommendations: string[];
  }> {
    const stats = await this.crudService.getSecurityStats(days || 7);

    const recommendations = this.generateSecurityRecommendations(stats);

    return {
      summary: {
        totalEvents: stats.totalEvents,
        blockedIps: stats.blockedIps,
        scanResults: stats.scanResults,
      },
      trends: {
        eventsByType: stats.eventsByType,
        eventsByRisk: stats.eventsByRisk,
      },
      topThreats: this.identifyTopThreats(stats.eventsByType),
      recommendations,
    };
  }

  /**
   * 중요 보안 이벤트 조회 (최근 24시간)
   */
  @Get('events/critical')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 50, window: 60 })
  async getCriticalEvents(): Promise<{
    events: SecurityEvent[];
    count: number;
    alertLevel: 'normal' | 'warning' | 'critical';
  }> {
    const events = await this.crudService.getSecurityEvents({
      riskLevel: SecurityRiskLevel.CRITICAL,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 전
    });

    let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (events.length > 10) alertLevel = 'critical';
    else if (events.length > 3) alertLevel = 'warning';

    return {
      events,
      count: events.length,
      alertLevel,
    };
  }

  /**
   * IP 차단 목록 조회
   */
  @Get('blocked-ips')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 50, window: 60 })
  async getBlockedIps(): Promise<{
    blockedIps: any[];
    activeCount: number;
    expiredCount: number;
  }> {
    // 실제 구현에서는 BlockedIp 리포지터리를 주입해서 사용
    return {
      blockedIps: [],
      activeCount: 0,
      expiredCount: 0,
    };
  }

  /**
   * IP 주소 차단
   */
  @Post('block-ip')
  @UseGuards(AdminGuard)
  @HighSecurity()
  @AuditLog('ip_block', 'security')
  async blockIp(@Body() blockData: BlockIpDto): Promise<{
    message: string;
    blockedIp: string;
    durationHours?: number;
  }> {
    if (!this.isValidIpAddress(blockData.ipAddress)) {
      throw new BadRequestException('유효하지 않은 IP 주소입니다.');
    }

    await this.crudService.blockIp(
      blockData.ipAddress,
      blockData.reason,
      blockData.riskLevel,
      blockData.durationHours,
    );

    return {
      message: 'IP 주소가 성공적으로 차단되었습니다.',
      blockedIp: blockData.ipAddress,
      durationHours: blockData.durationHours,
    };
  }

  /**
   * IP 주소 차단 해제
   */
  @Post('unblock-ip/:ipAddress')
  @UseGuards(AdminGuard)
  @HighSecurity()
  @AuditLog('ip_unblock', 'security')
  async unblockIp(@Param('ipAddress') ipAddress: string): Promise<{
    message: string;
    unblockedIp: string;
  }> {
    if (!this.isValidIpAddress(ipAddress)) {
      throw new BadRequestException('유효하지 않은 IP 주소입니다.');
    }

    await this.crudService.unblockIp(ipAddress);

    return {
      message: 'IP 주소 차단이 해제되었습니다.',
      unblockedIp: ipAddress,
    };
  }

  /**
   * IP 주소 차단 상태 확인
   */
  @Get('check-ip/:ipAddress')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 100, window: 60 })
  async checkIpStatus(@Param('ipAddress') ipAddress: string): Promise<{
    ipAddress: string;
    isBlocked: boolean;
    blockInfo?: any;
  }> {
    if (!this.isValidIpAddress(ipAddress)) {
      throw new BadRequestException('유효하지 않은 IP 주소입니다.');
    }

    const isBlocked = await this.crudService.isIpBlocked(ipAddress);

    return {
      ipAddress,
      isBlocked,
      blockInfo: isBlocked
        ? { reason: '차단된 IP', severity: 'high' }
        : undefined,
    };
  }

  /**
   * 파일 스캔 결과 조회
   */
  @Get('file-scans')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 50, window: 60 })
  async getFileScanResults(
    @Query()
    query: {
      status?: string;
      threatLevel?: SecurityRiskLevel;
      limit?: number;
    },
  ): Promise<{
    scans: any[];
    summary: {
      total: number;
      pending: number;
      completed: number;
      failed: number;
      threats: number;
    };
  }> {
    // 실제 구현에서는 FileScanResult 리포지터리를 사용
    return {
      scans: [],
      summary: {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        threats: 0,
      },
    };
  }

  /**
   * 파일 스캔 상세 결과 조회
   */
  @Get('file-scans/:scanId')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 100, window: 60 })
  async getFileScanDetail(
    @Param('scanId', ParseIntPipe) scanId: number,
  ): Promise<{
    scan: any;
    details: any;
    recommendations: string[];
  }> {
    // 실제 구현에서는 데이터베이스에서 조회
    return {
      scan: { id: scanId, status: 'completed' },
      details: { engines: [], threats: [] },
      recommendations: [],
    };
  }

  /**
   * 사용자별 보안 요약
   */
  @Get('user-security/:userId')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 50, window: 60 })
  async getUserSecuritySummary(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{
    userId: number;
    riskScore: number;
    recentEvents: SecurityEvent[];
    recommendations: string[];
    stats: any;
  }> {
    const recentEvents = await this.crudService.getSecurityEvents(
      {
        userId,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일간
      },
      20,
    );

    const riskScore = this.calculateUserRiskScore(recentEvents);
    const recommendations = this.generateUserSecurityRecommendations(
      recentEvents,
      riskScore,
    );

    return {
      userId,
      riskScore,
      recentEvents,
      recommendations,
      stats: {
        totalEvents: recentEvents.length,
        highRiskEvents: recentEvents.filter(
          (e) => e.riskLevel === SecurityRiskLevel.HIGH,
        ).length,
        criticalEvents: recentEvents.filter(
          (e) => e.riskLevel === SecurityRiskLevel.CRITICAL,
        ).length,
      },
    };
  }

  /**
   * 보안 설정 업데이트
   */
  @Post('settings')
  @UseGuards(AdminGuard)
  @HighSecurity()
  @AuditLog('security_settings_update', 'security')
  async updateSecuritySettings(
    @Body()
    settings: {
      autoBlockEnabled?: boolean;
      bruteForceThreshold?: number;
      fileScanEnabled?: boolean;
      behaviorAnalysisEnabled?: boolean;
      alertThresholds?: any;
    },
  ): Promise<{
    message: string;
    updatedSettings: any;
  }> {
    // 실제 구현에서는 설정을 데이터베이스나 Redis에 저장

    return {
      message: '보안 설정이 업데이트되었습니다.',
      updatedSettings: settings,
    };
  }

  /**
   * 보안 리포트 생성
   */
  @Get('reports/security')
  @UseGuards(AdminGuard)
  @AdminOnly()
  @RateLimit({ limit: 5, window: 300 }) // 5분에 5회
  async generateSecurityReport(
    @Query()
    query: {
      period?: 'daily' | 'weekly' | 'monthly';
      format?: 'json' | 'pdf';
    },
  ): Promise<{
    report: any;
    generatedAt: Date;
    period: string;
  }> {
    const period = query.period || 'weekly';
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

    const stats = await this.crudService.getSecurityStats(days);

    const report = {
      summary: stats,
      analysis: this.analyzeSecurityTrends(stats),
      recommendations: this.generateSecurityRecommendations(stats),
      actionItems: this.generateActionItems(stats),
    };

    return {
      report,
      generatedAt: new Date(),
      period,
    };
  }

  /**
   * IP 주소 유효성 검사
   */
  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * 사용자 위험 점수 계산
   */
  private calculateUserRiskScore(events: SecurityEvent[]): number {
    let score = 0;

    events.forEach((event) => {
      switch (event.riskLevel) {
        case SecurityRiskLevel.CRITICAL:
          score += 25;
          break;
        case SecurityRiskLevel.HIGH:
          score += 15;
          break;
        case SecurityRiskLevel.MEDIUM:
          score += 8;
          break;
        case SecurityRiskLevel.LOW:
          score += 3;
          break;
      }
    });

    return Math.min(score, 100); // 최대 100점
  }

  /**
   * 보안 권장사항 생성
   */
  private generateSecurityRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.totalEvents > 100) {
      recommendations.push(
        '보안 이벤트가 많이 발생하고 있습니다. 보안 정책을 검토해보세요.',
      );
    }

    if (stats.blockedIps > 20) {
      recommendations.push(
        '차단된 IP가 많습니다. 자동 차단 규칙을 검토해보세요.',
      );
    }

    const highRiskEvents =
      stats.eventsByRisk?.find((r: any) => r.riskLevel === 'high')?.count || 0;
    if (highRiskEvents > 10) {
      recommendations.push(
        '높은 위험도 이벤트가 많이 발생했습니다. 보안 강화가 필요합니다.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '현재 보안 상태가 양호합니다. 지속적인 모니터링을 유지하세요.',
      );
    }

    return recommendations;
  }

  /**
   * 사용자별 보안 권장사항 생성
   */
  private generateUserSecurityRecommendations(
    events: SecurityEvent[],
    riskScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push('위험 점수가 높습니다. 계정 보안을 강화해주세요.');
    }

    if (events.some((e) => e.type === SecurityEventType.BRUTE_FORCE_ATTACK)) {
      recommendations.push(
        '브루트포스 공격이 탐지되었습니다. 비밀번호를 변경하고 2FA를 활성화하세요.',
      );
    }

    if (events.some((e) => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY)) {
      recommendations.push(
        '의심스러운 활동이 탐지되었습니다. 계정 활동을 확인해보세요.',
      );
    }

    return recommendations;
  }

  /**
   * 주요 위협 식별
   */
  private identifyTopThreats(eventsByType: any[]): any[] {
    return eventsByType
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({
        type: item.type,
        count: item.count,
        severity: this.getThreatSeverity(item.type),
      }));
  }

  /**
   * 위협 심각도 계산
   */
  private getThreatSeverity(
    eventType: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const highSeverityEvents = [
      SecurityEventType.BRUTE_FORCE_ATTACK,
      SecurityEventType.DATA_BREACH_ATTEMPT,
      SecurityEventType.MALWARE_DETECTED,
      SecurityEventType.PRIVILEGE_ESCALATION,
    ];

    const mediumSeverityEvents = [
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.FILE_SCAN_THREAT,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
    ];

    if (highSeverityEvents.includes(eventType as SecurityEventType))
      return 'high';
    if (mediumSeverityEvents.includes(eventType as SecurityEventType))
      return 'medium';
    return 'low';
  }

  /**
   * 보안 트렌드 분석
   */
  private analyzeSecurityTrends(stats: any): any {
    return {
      threatTrend: stats.totalEvents > 50 ? 'increasing' : 'stable',
      mostCommonThreat: stats.eventsByType?.[0]?.type || 'none',
      riskDistribution: stats.eventsByRisk,
      alertLevel:
        stats.totalEvents > 100
          ? 'high'
          : stats.totalEvents > 50
            ? 'medium'
            : 'low',
    };
  }

  /**
   * 액션 아이템 생성
   */
  private generateActionItems(stats: any): string[] {
    const actionItems: string[] = [];

    if (stats.blockedIps > 10) {
      actionItems.push('차단된 IP 목록 검토 및 정리');
    }

    const criticalEvents =
      stats.eventsByRisk?.find((r: any) => r.riskLevel === 'critical')?.count ||
      0;
    if (criticalEvents > 0) {
      actionItems.push('중요 보안 이벤트 조사 및 대응');
    }

    actionItems.push('정기 보안 정책 검토');
    actionItems.push('사용자 보안 교육 실시');

    return actionItems;
  }
}
