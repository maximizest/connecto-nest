import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import {
  BlockedIp,
  FileScanResult,
  SecurityEvent,
  SecurityEventStatus,
  SecurityEventType,
  SecurityRiskLevel,
} from './security.entity';

interface SecurityEventData {
  type: SecurityEventType;
  riskLevel: SecurityRiskLevel;
  title: string;
  description: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  requestUrl?: string;
  requestMethod?: string;
  resourceType?: string;
  resourceId?: number;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  metadata?: any;
  detectionSource?: string;
}

interface FileSecurityCheck {
  isAllowed: boolean;
  riskLevel: SecurityRiskLevel;
  threats: string[];
  scanId?: number;
}

/**
 * 보안 서비스
 *
 * 보안 이벤트 기록, IP 차단, 파일 스캔 등 전반적인 보안 관리를 담당합니다.
 */
@Injectable()
export class SecurityService extends CrudService<SecurityEvent> {
  private readonly logger = new Logger(SecurityService.name);
  private readonly CACHE_PREFIX = 'security';
  private readonly RATE_LIMIT_PREFIX = 'rate_limit';
  private readonly IP_BLOCK_CACHE_TTL = 3600; // 1시간

  // 보안 임계값 설정
  private readonly SECURITY_THRESHOLDS = {
    LOGIN_ATTEMPTS_PER_HOUR: 5,
    API_REQUESTS_PER_MINUTE: 60,
    FILE_UPLOAD_PER_HOUR: 50,
    SUSPICIOUS_ACTIVITY_SCORE: 80,
    BRUTE_FORCE_ATTEMPTS: 10,
    AUTO_BLOCK_THRESHOLD: 100,
  };

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
    @InjectRepository(BlockedIp)
    private readonly blockedIpRepository: Repository<BlockedIp>,
    @InjectRepository(FileScanResult)
    private readonly fileScanRepository: Repository<FileScanResult>,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(securityEventRepository);
    this.logger.log('🔒 Security service initialized');
  }

  /**
   * 보안 이벤트 기록
   */
  async recordSecurityEvent(data: SecurityEventData): Promise<SecurityEvent> {
    try {
      // 보안 이벤트 생성
      const event = this.securityEventRepository.create(data);
      const savedEvent = await this.securityEventRepository.save(event);

      // Redis에 최근 이벤트 캐싱
      await this.cacheRecentEvent(savedEvent);

      // 중요한 이벤트인 경우 즉시 알림
      if (savedEvent.isCritical()) {
        this.eventEmitter.emit('security.critical.event', savedEvent);
      }

      // 자동 차단 규칙 적용
      await this.evaluateAutoBlock(savedEvent);

      this.logger.warn(
        `Security event recorded: ${data.type} (${data.riskLevel}) - ${data.title}`,
      );

      return savedEvent;
    } catch (error) {
      this.logger.error(
        `Failed to record security event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * IP 주소 차단 확인
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    try {
      // Redis 캐시에서 먼저 확인
      const cacheKey = `${this.CACHE_PREFIX}:blocked_ip:${ipAddress}`;
      const cached = await this.redisService.get(cacheKey);

      if (cached !== null) {
        return cached === 'true';
      }

      // 데이터베이스에서 확인
      const blockedIp = await this.blockedIpRepository.findOne({
        where: { ipAddress, isActive: true },
      });

      let isBlocked = false;

      if (blockedIp) {
        if (blockedIp.isExpired()) {
          // 만료된 차단 해제
          await this.unblockIp(ipAddress);
          isBlocked = false;
        } else {
          isBlocked = true;
        }
      }

      // 캐시에 저장
      await this.redisService.set(
        cacheKey,
        isBlocked.toString(),
        this.IP_BLOCK_CACHE_TTL,
      );

      return isBlocked;
    } catch (error) {
      this.logger.error(
        `Failed to check IP block: ${error.message}`,
        error.stack,
      );
      return false; // 오류 시 통과시킴 (가용성 우선)
    }
  }

  /**
   * IP 주소 차단
   */
  async blockIp(
    ipAddress: string,
    reason: string,
    riskLevel: SecurityRiskLevel,
    durationHours?: number,
    blockedBy?: number,
  ): Promise<void> {
    try {
      const existingBlock = await this.blockedIpRepository.findOne({
        where: { ipAddress },
      });

      if (existingBlock) {
        // 기존 차단 연장
        existingBlock.extendBlock(durationHours || 24);
        existingBlock.reason = reason;
        existingBlock.riskLevel = riskLevel;
        await this.blockedIpRepository.save(existingBlock);
      } else {
        // 새 차단 생성
        const blockedUntil = durationHours
          ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
          : undefined; // 영구 차단

        const newBlock = this.blockedIpRepository.create({
          ipAddress,
          reason,
          riskLevel,
          blockedUntil,
          blockedBy,
          blockCount: 1,
          lastViolationAt: new Date(),
        });

        await this.blockedIpRepository.save(newBlock);
      }

      // 캐시 무효화
      await this.invalidateIpCache(ipAddress);

      // 보안 이벤트 기록
      await this.recordSecurityEvent({
        type: SecurityEventType.IP_BLOCKED,
        riskLevel,
        title: `IP 차단: ${ipAddress}`,
        description: `IP ${ipAddress}가 차단되었습니다. 사유: ${reason}`,
        ipAddress,
        detectionSource: 'auto_block_system',
      });

      this.logger.warn(`IP blocked: ${ipAddress} (${reason})`);
    } catch (error) {
      this.logger.error(`Failed to block IP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * IP 주소 차단 해제
   */
  async unblockIp(ipAddress: string): Promise<void> {
    try {
      const blockedIp = await this.blockedIpRepository.findOne({
        where: { ipAddress },
      });

      if (blockedIp) {
        blockedIp.unblock();
        await this.blockedIpRepository.save(blockedIp);

        // 캐시 무효화
        await this.invalidateIpCache(ipAddress);

        this.logger.log(`IP unblocked: ${ipAddress}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unblock IP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 파일 보안 검사
   */
  async checkFileSecurity(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    uploadedBy?: number,
    uploadIp?: string,
  ): Promise<FileSecurityCheck> {
    try {
      // 파일 해시 생성
      const fileHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');

      // 기존 스캔 결과 확인
      const existingScan = await this.fileScanRepository.findOne({
        where: { fileHash },
      });

      if (existingScan && existingScan.isScanned()) {
        return {
          isAllowed: existingScan.isSafe(),
          riskLevel: existingScan.threatLevel || SecurityRiskLevel.LOW,
          threats: existingScan.scanResults?.detectedThreats || [],
          scanId: existingScan.id,
        };
      }

      // 새 스캔 생성
      const scanResult = this.fileScanRepository.create({
        fileHash,
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        uploadedBy,
        uploadIp,
        scanStatus: 'pending',
      });

      await this.fileScanRepository.save(scanResult);

      // 파일 스캔 시작 (백그라운드)
      this.performFileScan(scanResult.id, fileBuffer);

      // 임시로 기본 검사 수행
      const basicCheck = this.performBasicFileCheck(
        fileBuffer,
        fileName,
        mimeType,
      );

      return {
        isAllowed: basicCheck.isAllowed,
        riskLevel: basicCheck.riskLevel,
        threats: basicCheck.threats,
        scanId: scanResult.id,
      };
    } catch (error) {
      this.logger.error(
        `File security check failed: ${error.message}`,
        error.stack,
      );

      // 오류 시 보수적으로 차단
      return {
        isAllowed: false,
        riskLevel: SecurityRiskLevel.HIGH,
        threats: ['File scan error'],
      };
    }
  }

  /**
   * Rate Limiting 검사
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const redisKey = `${this.RATE_LIMIT_PREFIX}:${key}`;
      const redis = this.redisService.getClient();
      const current = await redis.incr(redisKey);

      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const ttl = await redis.ttl(redisKey);
      const resetTime = Date.now() + ttl * 1000;

      if (current > limit) {
        // Rate limit 초과 이벤트 기록
        await this.recordSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          riskLevel: SecurityRiskLevel.MEDIUM,
          title: 'Rate Limit 초과',
          description: `Rate limit 초과: ${key} (${current}/${limit})`,
          metadata: { key, current, limit, windowSeconds },
          detectionSource: 'rate_limiter',
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed: ${error.message}`,
        error.stack,
      );

      // 오류 시 통과시킴 (가용성 우선)
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  /**
   * 사용자 행동 분석
   */
  async analyzeUserBehavior(
    userId: number,
    action: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ suspiciousScore: number; shouldBlock: boolean }> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:user_behavior:${userId}`;
      const behaviorData = await this.redisService.get(cacheKey);

      let behavior = behaviorData
        ? JSON.parse(behaviorData)
        : {
            actions: [],
            ipAddresses: new Set(),
            userAgents: new Set(),
            suspiciousScore: 0,
          };

      // 행동 기록
      behavior.actions.push({
        action,
        timestamp: Date.now(),
        ipAddress,
        userAgent,
      });

      if (ipAddress) behavior.ipAddresses.add(ipAddress);
      if (userAgent) behavior.userAgents.add(userAgent);

      // 의심 점수 계산
      behavior.suspiciousScore = this.calculateSuspiciousScore(behavior);

      // 24시간 후 만료
      await this.redisService.set(cacheKey, JSON.stringify(behavior), 86400);

      const shouldBlock =
        behavior.suspiciousScore >=
        this.SECURITY_THRESHOLDS.SUSPICIOUS_ACTIVITY_SCORE;

      if (shouldBlock) {
        await this.recordSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          riskLevel: SecurityRiskLevel.HIGH,
          title: '의심스러운 사용자 활동',
          description: `사용자 ${userId}의 의심스러운 활동 탐지 (점수: ${behavior.suspiciousScore})`,
          userId,
          ipAddress,
          userAgent,
          metadata: { suspiciousScore: behavior.suspiciousScore },
          detectionSource: 'behavior_analyzer',
        });
      }

      return {
        suspiciousScore: behavior.suspiciousScore,
        shouldBlock,
      };
    } catch (error) {
      this.logger.error(
        `User behavior analysis failed: ${error.message}`,
        error.stack,
      );
      return { suspiciousScore: 0, shouldBlock: false };
    }
  }

  /**
   * 보안 이벤트 조회
   */
  async getSecurityEvents(
    filters: {
      type?: SecurityEventType;
      riskLevel?: SecurityRiskLevel;
      userId?: number;
      ipAddress?: string;
      status?: SecurityEventStatus;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
  ): Promise<SecurityEvent[]> {
    try {
      const queryBuilder = this.securityEventRepository
        .createQueryBuilder('event')
        .orderBy('event.createdAt', 'DESC')
        .limit(limit);

      if (filters.type) {
        queryBuilder.andWhere('event.type = :type', { type: filters.type });
      }

      if (filters.riskLevel) {
        queryBuilder.andWhere('event.riskLevel = :riskLevel', {
          riskLevel: filters.riskLevel,
        });
      }

      if (filters.userId) {
        queryBuilder.andWhere('event.userId = :userId', {
          userId: filters.userId,
        });
      }

      if (filters.ipAddress) {
        queryBuilder.andWhere('event.ipAddress = :ipAddress', {
          ipAddress: filters.ipAddress,
        });
      }

      if (filters.status) {
        queryBuilder.andWhere('event.status = :status', {
          status: filters.status,
        });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('event.createdAt >= :startDate', {
          startDate: filters.startDate,
        });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('event.createdAt <= :endDate', {
          endDate: filters.endDate,
        });
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(
        `Failed to get security events: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 보안 통계 조회
   */
  async getSecurityStats(days: number = 7): Promise<{
    totalEvents: number;
    eventsByType: any;
    eventsByRisk: any;
    blockedIps: number;
    scanResults: any;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalEvents, eventsByType, eventsByRisk, blockedIps, scanStats] =
        await Promise.all([
          this.securityEventRepository.count({
            where: { createdAt: { $gte: startDate } as any },
          }),
          this.securityEventRepository
            .createQueryBuilder('event')
            .select('event.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('event.createdAt >= :startDate', { startDate })
            .groupBy('event.type')
            .getRawMany(),
          this.securityEventRepository
            .createQueryBuilder('event')
            .select('event.riskLevel', 'riskLevel')
            .addSelect('COUNT(*)', 'count')
            .where('event.createdAt >= :startDate', { startDate })
            .groupBy('event.riskLevel')
            .getRawMany(),
          this.blockedIpRepository.count({ where: { isActive: true } }),
          this.fileScanRepository
            .createQueryBuilder('scan')
            .select('scan.scanStatus', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('scan.createdAt >= :startDate', { startDate })
            .groupBy('scan.scanStatus')
            .getRawMany(),
        ]);

      return {
        totalEvents,
        eventsByType,
        eventsByRisk,
        blockedIps,
        scanResults: scanStats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get security stats: ${error.message}`,
        error.stack,
      );
      return {
        totalEvents: 0,
        eventsByType: [],
        eventsByRisk: [],
        blockedIps: 0,
        scanResults: [],
      };
    }
  }

  /**
   * 기본 파일 검사
   */
  private performBasicFileCheck(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): FileSecurityCheck {
    const threats: string[] = [];
    let riskLevel = SecurityRiskLevel.LOW;

    // 파일 크기 검사 (500MB 초과)
    if (fileBuffer.length > 500 * 1024 * 1024) {
      threats.push('파일 크기가 너무 큼');
      riskLevel = SecurityRiskLevel.MEDIUM;
    }

    // 파일 확장자와 MIME 타입 불일치 검사
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && !this.isMimeTypeMatching(extension, mimeType)) {
      threats.push('파일 확장자와 MIME 타입 불일치');
      riskLevel = SecurityRiskLevel.MEDIUM;
    }

    // 위험한 파일 타입 검사
    const dangerousTypes = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com'];
    if (extension && dangerousTypes.includes(extension)) {
      threats.push('위험한 파일 형식');
      riskLevel = SecurityRiskLevel.HIGH;
    }

    // 파일 헤더 검사 (기본적인 매직 넘버 확인)
    if (fileBuffer.length > 0) {
      const header = fileBuffer.subarray(0, Math.min(16, fileBuffer.length));
      if (this.hasExecutableHeader(header)) {
        threats.push('실행 파일 헤더 탐지');
        riskLevel = SecurityRiskLevel.HIGH;
      }
    }

    return {
      isAllowed: threats.length === 0,
      riskLevel,
      threats,
    };
  }

  /**
   * 파일 스캔 수행 (백그라운드)
   */
  private async performFileScan(
    scanId: number,
    fileBuffer: Buffer,
  ): Promise<void> {
    try {
      const scanResult = await this.fileScanRepository.findOne({
        where: { id: scanId },
      });

      if (!scanResult) return;

      scanResult.startScan();
      await this.fileScanRepository.save(scanResult);

      // 실제 바이러스 스캔 로직 (여기서는 모의)
      // 실제 구현에서는 VirusTotal API, ClamAV 등을 사용
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 모의 스캔 시간

      const mockScanResults = {
        engines: [{ name: 'mock_engine', result: 'clean', threat: null }],
        detectedThreats: [],
        confidence: 95,
        scanTime: 1000,
      };

      scanResult.completeScan(mockScanResults);
      await this.fileScanRepository.save(scanResult);

      this.logger.log(`File scan completed: ${scanResult.fileName}`);
    } catch (error) {
      this.logger.error(`File scan failed: ${error.message}`, error.stack);

      const scanResult = await this.fileScanRepository.findOne({
        where: { id: scanId },
      });

      if (scanResult) {
        scanResult.failScan(error.message);
        await this.fileScanRepository.save(scanResult);
      }
    }
  }

  /**
   * 자동 차단 규칙 평가
   */
  private async evaluateAutoBlock(event: SecurityEvent): Promise<void> {
    try {
      if (!event.ipAddress) return;

      // IP별 이벤트 수 확인
      const recentEvents = await this.securityEventRepository.count({
        where: {
          ipAddress: event.ipAddress,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } as any, // 최근 1시간
        },
      });

      let shouldBlock = false;
      let blockHours = 1;
      let reason = '';

      // 브루트포스 공격 탐지
      if (
        event.isBruteForceRelated() &&
        recentEvents >= this.SECURITY_THRESHOLDS.BRUTE_FORCE_ATTEMPTS
      ) {
        shouldBlock = true;
        blockHours = 24;
        reason = '브루트포스 공격 탐지';
      }

      // 높은 위험도 이벤트 반복
      if (event.riskLevel === SecurityRiskLevel.HIGH && recentEvents >= 5) {
        shouldBlock = true;
        blockHours = 12;
        reason = '높은 위험도 이벤트 반복';
      }

      // 중요 이벤트 즉시 차단
      if (event.isCritical()) {
        shouldBlock = true;
        blockHours = 48;
        reason = '중요 보안 위협 탐지';
      }

      if (shouldBlock) {
        await this.blockIp(
          event.ipAddress,
          reason,
          event.riskLevel,
          blockHours,
        );
      }
    } catch (error) {
      this.logger.error(
        `Auto block evaluation failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 의심 점수 계산
   */
  private calculateSuspiciousScore(behavior: any): number {
    let score = 0;

    // 짧은 시간 내 많은 요청
    const recentActions = behavior.actions.filter(
      (a: any) => Date.now() - a.timestamp < 60 * 1000, // 최근 1분
    );

    if (recentActions.length > 20) score += 30;
    else if (recentActions.length > 10) score += 15;

    // 여러 IP 주소 사용
    if (behavior.ipAddresses.size > 5) score += 25;
    else if (behavior.ipAddresses.size > 3) score += 15;

    // 여러 User-Agent 사용
    if (behavior.userAgents.size > 3) score += 20;
    else if (behavior.userAgents.size > 2) score += 10;

    // 24시간 내 총 액션 수
    const dailyActions = behavior.actions.filter(
      (a: any) => Date.now() - a.timestamp < 24 * 60 * 60 * 1000,
    );

    if (dailyActions.length > 1000) score += 40;
    else if (dailyActions.length > 500) score += 20;

    return Math.min(score, 100); // 최대 100점
  }

  /**
   * MIME 타입과 확장자 일치 확인
   */
  private isMimeTypeMatching(extension: string, mimeType: string): boolean {
    const mimeMap: { [key: string]: string[] } = {
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      gif: ['image/gif'],
      webp: ['image/webp'],
      mp4: ['video/mp4'],
      webm: ['video/webm'],
      pdf: ['application/pdf'],
      txt: ['text/plain'],
      zip: ['application/zip'],
      rar: ['application/x-rar-compressed'],
    };

    return mimeMap[extension]?.includes(mimeType) || false;
  }

  /**
   * 실행 파일 헤더 확인
   */
  private hasExecutableHeader(header: Buffer): boolean {
    // PE 헤더 (Windows 실행 파일)
    if (header.length >= 2 && header[0] === 0x4d && header[1] === 0x5a) {
      return true;
    }

    // ELF 헤더 (Linux 실행 파일)
    if (
      header.length >= 4 &&
      header[0] === 0x7f &&
      header[1] === 0x45 &&
      header[2] === 0x4c &&
      header[3] === 0x46
    ) {
      return true;
    }

    return false;
  }

  /**
   * 최근 이벤트 캐싱
   */
  private async cacheRecentEvent(event: SecurityEvent): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:recent_events`;
      const events = await this.redisService.get(cacheKey);
      const eventList = events ? JSON.parse(events) : [];

      eventList.unshift({
        id: event.id,
        type: event.type,
        riskLevel: event.riskLevel,
        title: event.title,
        createdAt: event.createdAt,
      });

      // 최대 100개만 유지
      const limitedEvents = eventList.slice(0, 100);

      await this.redisService.set(
        cacheKey,
        JSON.stringify(limitedEvents),
        3600,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache recent event: ${error.message}`);
    }
  }

  /**
   * IP 캐시 무효화
   */
  private async invalidateIpCache(ipAddress: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:blocked_ip:${ipAddress}`;
      await this.redisService.del(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to invalidate IP cache: ${error.message}`);
    }
  }
}
