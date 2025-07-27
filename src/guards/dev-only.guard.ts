import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 환경변수로 스키마 API 활성화 제어
    const isSchemaEnabled = process.env.ENABLE_SCHEMA_API === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev' ||
      !process.env.NODE_ENV;

    // IP 주소 체크 (로컬호스트에서만 허용)
    const allowedIPs = ['127.0.0.1', '::1', 'localhost'];
    const clientIP = request.ip || request.connection.remoteAddress;
    const isLocalhost = allowedIPs.some(ip => clientIP?.includes(ip));

    // 스키마 API가 명시적으로 활성화되었거나 개발 환경인 경우에만 허용
    const isEnvironmentAllowed = isSchemaEnabled || isDevelopment;

    if (!isEnvironmentAllowed) {
      throw new ForbiddenException({
        message: 'IP Access Denied',
        statusCode: 403,
      });
    }

    // 개발 환경이라도 로컬호스트가 아니면 차단
    if (isDevelopment && !isLocalhost && !isSchemaEnabled) {
      throw new ForbiddenException({
        message: 'IP Access Denied',
        statusCode: 403,
      });
    }

    return true;
  }
} 