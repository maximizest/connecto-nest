import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SecurityEventType, SecurityRiskLevel } from '../security.entity';
import { SecurityService } from '../security.service';

/**
 * IP 차단 가드
 *
 * 차단된 IP 주소의 접근을 차단합니다.
 */
@Injectable()
export class IpBlockGuard implements CanActivate {
  private readonly logger = new Logger(IpBlockGuard.name);

  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ipAddress = this.getClientIp(request);

    if (!ipAddress) {
      return true; // IP를 확인할 수 없으면 통과
    }

    try {
      const isBlocked = await this.securityService.isIpBlocked(ipAddress);

      if (isBlocked) {
        // 차단된 IP의 접근 시도 기록
        await this.securityService.recordSecurityEvent({
          type: SecurityEventType.UNAUTHORIZED_ACCESS,
          riskLevel: SecurityRiskLevel.HIGH,
          title: '차단된 IP의 접근 시도',
          description: `차단된 IP ${ipAddress}가 접근을 시도했습니다.`,
          ipAddress,
          userAgent: request.headers['user-agent'],
          requestUrl: request.url,
          requestMethod: request.method,
          detectionSource: 'ip_block_guard',
        });

        throw new ForbiddenException('접근이 차단된 IP 주소입니다.');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`IP block check failed: ${error.message}`);
      return true; // 오류 시 통과시킴 (가용성 우선)
    }
  }

  private getClientIp(request: Request): string | undefined {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }
}

/**
 * Rate Limiting 가드
 *
 * API 호출 빈도를 제한합니다.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ipAddress = this.getClientIp(request);

    // Rate limit 설정 확인
    const rateLimit = this.reflector.getAllAndOverride<{
      limit: number;
      window: number;
      keyGenerator?: (request: Request) => string;
    }>('rateLimit', [context.getHandler(), context.getClass()]);

    if (!rateLimit) {
      return true; // Rate limit 설정이 없으면 통과
    }

    try {
      // 키 생성 (사용자별 또는 IP별)
      const key = rateLimit.keyGenerator
        ? rateLimit.keyGenerator(request)
        : user?.id
          ? `user:${user.id}`
          : `ip:${ipAddress}`;

      const result = await this.securityService.checkRateLimit(
        key,
        rateLimit.limit,
        rateLimit.window,
      );

      if (!result.allowed) {
        // Rate limit 초과 보안 이벤트는 SecurityService에서 자동 기록됨
        throw new ForbiddenException({
          message: 'Too Many Requests',
          statusCode: 429,
          remaining: result.remaining,
          resetTime: result.resetTime,
        });
      }

      // 응답 헤더에 Rate limit 정보 추가
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', rateLimit.limit);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader(
        'X-RateLimit-Reset',
        new Date(result.resetTime).toISOString(),
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`Rate limit check failed: ${error.message}`);
      return true; // 오류 시 통과시킴 (가용성 우선)
    }
  }

  private getClientIp(request: Request): string | undefined {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }
}

/**
 * 파일 보안 가드
 *
 * 파일 업로드 시 보안 검사를 수행합니다.
 */
@Injectable()
export class FileSecurityGuard implements CanActivate {
  private readonly logger = new Logger(FileSecurityGuard.name);

  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ipAddress = this.getClientIp(request);

    // 파일 업로드 요청인지 확인
    if (!request.files && !request.file) {
      return true; // 파일 업로드가 아니면 통과
    }

    try {
      const files = request.files || (request.file ? [request.file] : []);

      const fileArray = Array.isArray(files) ? files : [files];

      for (const file of fileArray) {
        if (!file || !file.buffer) continue;

        // 파일 속성 타입 안전 처리
        const fileName =
          typeof file.originalname === 'string'
            ? file.originalname
            : typeof file.filename === 'string'
              ? file.filename
              : 'unknown';
        const mimeType =
          typeof file.mimetype === 'string'
            ? file.mimetype
            : 'application/octet-stream';
        const fileSize = typeof file.size === 'number' ? file.size : 0;

        // 파일 버퍼 타입 안전 처리
        const fileBuffer = Array.isArray(file.buffer)
          ? file.buffer[0]
          : file.buffer;
        if (!Buffer.isBuffer(fileBuffer)) {
          continue; // 유효한 버퍼가 아니면 건너뜀
        }

        // 파일 보안 검사
        const securityCheck = await this.securityService.checkFileSecurity(
          fileBuffer,
          fileName,
          mimeType,
          user?.id,
          ipAddress,
        );

        if (!securityCheck.isAllowed) {
          // 위험한 파일 업로드 시도 기록
          await this.securityService.recordSecurityEvent({
            type: SecurityEventType.FILE_SCAN_THREAT,
            riskLevel: securityCheck.riskLevel,
            title: '위험한 파일 업로드 시도',
            description: `위험한 파일 업로드가 탐지되었습니다: ${fileName}`,
            userId: user?.id,
            ipAddress,
            userAgent: request.headers['user-agent'],
            fileName: fileName,
            fileType: mimeType,
            fileSize: fileSize,
            metadata: {
              threats: securityCheck.threats,
              scanId: securityCheck.scanId,
            },
            detectionSource: 'file_security_guard',
          });

          throw new ForbiddenException({
            message: '업로드가 차단된 파일입니다.',
            threats: securityCheck.threats,
            riskLevel: securityCheck.riskLevel,
          });
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`File security check failed: ${error.message}`);

      // 오류 시 보수적으로 차단
      throw new ForbiddenException('파일 보안 검사 중 오류가 발생했습니다.');
    }
  }

  private getClientIp(request: Request): string | undefined {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }
}

/**
 * 사용자 행동 분석 가드
 *
 * 의심스러운 사용자 행동을 탐지합니다.
 */
@Injectable()
export class UserBehaviorGuard implements CanActivate {
  private readonly logger = new Logger(UserBehaviorGuard.name);

  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    if (!user?.id) {
      return true; // 인증되지 않은 요청은 다른 가드에서 처리
    }

    try {
      const endpoint = `${request.method} ${request.route?.path || request.url}`;

      const behaviorAnalysis = await this.securityService.analyzeUserBehavior(
        user.id,
        endpoint,
        ipAddress,
        userAgent,
      );

      if (behaviorAnalysis.shouldBlock) {
        throw new ForbiddenException({
          message: '의심스러운 활동이 탐지되었습니다.',
          suspiciousScore: behaviorAnalysis.suspiciousScore,
        });
      }

      // 의심 점수가 높으면 경고 로그
      if (behaviorAnalysis.suspiciousScore > 50) {
        this.logger.warn(
          `High suspicious score for user ${user.id}: ${behaviorAnalysis.suspiciousScore}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`User behavior analysis failed: ${error.message}`);
      return true; // 오류 시 통과시킴 (가용성 우선)
    }
  }

  private getClientIp(request: Request): string | undefined {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }
}

/**
 * 리소스 접근 권한 강화 가드
 *
 * Travel/Planet 리소스에 대한 세밀한 접근 제어를 수행합니다.
 */
@Injectable()
export class EnhancedResourceGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedResourceGuard.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ipAddress = this.getClientIp(request);

    if (!user?.id) {
      return true; // 인증 가드에서 처리됨
    }

    try {
      // 권한 요구사항 확인
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        'permissions',
        [context.getHandler(), context.getClass()],
      );

      const resourceType = this.reflector.getAllAndOverride<string>(
        'resourceType',
        [context.getHandler(), context.getClass()],
      );

      if (!requiredPermissions || !resourceType) {
        return true; // 권한 설정이 없으면 통과
      }

      // 리소스 ID 추출
      const resourceId = this.extractResourceId(request, resourceType);

      // 권한 검사 (실제 구현에서는 더 정교한 권한 시스템 필요)
      const hasPermission = await this.checkResourcePermission(
        user.id,
        resourceType,
        resourceId,
        requiredPermissions,
      );

      if (!hasPermission) {
        // 권한 없는 접근 시도 기록
        await this.securityService.recordSecurityEvent({
          type: SecurityEventType.PERMISSION_DENIED,
          riskLevel: SecurityRiskLevel.MEDIUM,
          title: '권한 없는 리소스 접근',
          description: `사용자 ${user.id}가 ${resourceType} ${resourceId}에 대한 권한 없는 접근을 시도했습니다.`,
          userId: user.id,
          ipAddress,
          userAgent: request.headers['user-agent'],
          requestUrl: request.url,
          requestMethod: request.method,
          resourceType,
          resourceId,
          metadata: { requiredPermissions },
          detectionSource: 'resource_guard',
        });

        throw new ForbiddenException('리소스에 접근할 권한이 없습니다.');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`Resource permission check failed: ${error.message}`);
      return true; // 오류 시 통과시킴 (가용성 우선)
    }
  }

  private getClientIp(request: Request): string | undefined {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }

  private extractResourceId(
    request: Request,
    resourceType: string,
  ): number | undefined {
    const params = request.params;

    // resourceType에 따라 ID 추출
    switch (resourceType) {
      case 'travel':
        return params.travelId ? parseInt(params.travelId) : undefined;
      case 'planet':
        return params.planetId ? parseInt(params.planetId) : undefined;
      case 'message':
        return params.messageId ? parseInt(params.messageId) : undefined;
      default:
        return params.id ? parseInt(params.id) : undefined;
    }
  }

  private async checkResourcePermission(
    userId: number,
    resourceType: string,
    resourceId: number | undefined,
    requiredPermissions: string[],
  ): Promise<boolean> {
    // 실제 구현에서는 데이터베이스에서 사용자 권한을 확인
    // 여기서는 간단한 모의 구현
    return true; // 임시로 모든 권한 허용
  }
}
