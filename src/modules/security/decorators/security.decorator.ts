import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import 'reflect-metadata';

/**
 * Rate Limit 데코레이터
 *
 * API 엔드포인트에 Rate Limiting을 적용합니다.
 */
export const RateLimit = (options: {
  limit: number;
  window: number; // seconds
  keyGenerator?: (request: Request) => string;
}) => SetMetadata('rateLimit', options);

/**
 * 리소스 타입 데코레이터
 *
 * 리소스 접근 권한 확인에 사용됩니다.
 */
export const ResourceType = (
  type: 'travel' | 'planet' | 'message' | 'file' | 'user',
) => SetMetadata('resourceType', type);

/**
 * 권한 요구사항 데코레이터
 *
 * 특정 권한이 필요한 엔드포인트에 사용됩니다.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * 파일 보안 검사 데코레이터
 *
 * 파일 업로드 엔드포인트에 보안 검사를 적용합니다.
 */
export const FileSecurityCheck = () => SetMetadata('fileSecurityCheck', true);

/**
 * IP 화이트리스트 데코레이터
 *
 * 특정 IP 주소만 접근할 수 있도록 제한합니다.
 */
export const IpWhitelist = (ips: string[]) => SetMetadata('ipWhitelist', ips);

/**
 * 보안 로깅 데코레이터
 *
 * 보안 관련 로그를 자동으로 기록합니다.
 */
export const SecurityLog = (eventType?: string) =>
  SetMetadata('securityLog', eventType || 'api_access');

/**
 * 사용자 행동 분석 제외 데코레이터
 *
 * 특정 엔드포인트를 사용자 행동 분석에서 제외합니다.
 */
export const SkipBehaviorAnalysis = () =>
  SetMetadata('skipBehaviorAnalysis', true);

/**
 * CSRF 보호 데코레이터
 *
 * CSRF 토큰 검증을 요구합니다.
 */
export const CSRFProtection = () => SetMetadata('csrfProtection', true);

/**
 * 보안 헤더 설정 데코레이터
 *
 * 응답에 보안 헤더를 추가합니다.
 */
export const SecurityHeaders = (options?: {
  hsts?: boolean;
  noSniff?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  xssProtection?: boolean;
  contentSecurityPolicy?: string;
}) => SetMetadata('securityHeaders', options || {});

/**
 * 관리자 전용 데코레이터
 *
 * 관리자 권한이 필요한 엔드포인트에 사용됩니다.
 */
export const AdminOnly = () => SetMetadata('adminOnly', true);

/**
 * 소유자 전용 데코레이터
 *
 * 리소스 소유자만 접근할 수 있도록 제한합니다.
 */
export const OwnerOnly = () => SetMetadata('ownerOnly', true);

/**
 * 시간 기반 접근 제어 데코레이터
 *
 * 특정 시간대에만 접근할 수 있도록 제한합니다.
 */
export const TimeBasedAccess = (options: {
  allowedHours: number[]; // 24시간 형식 (0-23)
  timezone?: string; // 기본값: UTC
}) => SetMetadata('timeBasedAccess', options);

/**
 * 지역 기반 접근 제어 데코레이터
 *
 * 특정 지역에서만 접근할 수 있도록 제한합니다.
 */
export const GeoRestriction = (options: {
  allowedCountries?: string[]; // ISO 국가 코드
  blockedCountries?: string[]; // ISO 국가 코드
}) => SetMetadata('geoRestriction', options);

/**
 * 디바이스 타입 제한 데코레이터
 *
 * 특정 디바이스 타입에서만 접근할 수 있도록 제한합니다.
 */
export const DeviceRestriction = (
  allowedTypes: ('mobile' | 'desktop' | 'tablet')[],
) => SetMetadata('deviceRestriction', allowedTypes);

/**
 * API 키 요구 데코레이터
 *
 * API 키가 필요한 엔드포인트에 사용됩니다.
 */
export const RequireApiKey = (scope?: string) =>
  SetMetadata('requireApiKey', scope || 'default');

/**
 * 2FA 요구 데코레이터
 *
 * 2단계 인증이 필요한 민감한 작업에 사용됩니다.
 */
export const Require2FA = () => SetMetadata('require2FA', true);

/**
 * 감사 로그 데코레이터
 *
 * 중요한 작업에 대한 감사 로그를 기록합니다.
 */
export const AuditLog = (action: string, resourceType?: string) =>
  SetMetadata('auditLog', { action, resourceType });

/**
 * 컨텐츠 검열 데코레이터
 *
 * 사용자 입력 컨텐츠에 대한 자동 검열을 적용합니다.
 */
export const ContentModeration = (options?: {
  strictness: 'low' | 'medium' | 'high';
  categories: ('hate' | 'violence' | 'adult' | 'spam')[];
}) =>
  SetMetadata(
    'contentModeration',
    options || { strictness: 'medium', categories: ['hate', 'violence'] },
  );

/**
 * 업로드 제한 데코레이터
 *
 * 파일 업로드에 대한 세부 제한을 설정합니다.
 */
export const UploadRestriction = (options: {
  maxFileSize?: number; // bytes
  allowedMimeTypes?: string[];
  maxFiles?: number;
  scanForMalware?: boolean;
}) => SetMetadata('uploadRestriction', options);

/**
 * 민감한 작업 데코레이터
 *
 * 민감한 작업에 대한 추가 보안 검사를 적용합니다.
 */
export const SensitiveOperation = (
  level: 'low' | 'medium' | 'high' | 'critical' = 'medium',
) => SetMetadata('sensitiveOperation', level);

/**
 * 캐시 제외 데코레이터
 *
 * 보안상 캐시하지 않아야 하는 응답에 사용됩니다.
 */
export const NoCache = () => SetMetadata('noCache', true);

/**
 * 암호화 요구 데코레이터
 *
 * 응답을 암호화해야 하는 민감한 데이터에 사용됩니다.
 */
export const EncryptResponse = (algorithm: 'AES256' | 'RSA' = 'AES256') =>
  SetMetadata('encryptResponse', algorithm);

/**
 * 세션 고정 방지 데코레이터
 *
 * 로그인 후 세션 ID를 새로 생성합니다.
 */
export const RegenerateSession = () => SetMetadata('regenerateSession', true);

/**
 * 브루트포스 보호 데코레이터
 *
 * 로그인 엔드포인트 등에 브루트포스 보호를 적용합니다.
 */
export const BruteForceProtection = (options?: {
  maxAttempts: number;
  blockDuration: number; // minutes
  trackBy: 'ip' | 'user' | 'both';
}) =>
  SetMetadata(
    'bruteForceProtection',
    options || {
      maxAttempts: 5,
      blockDuration: 15,
      trackBy: 'both',
    },
  );

// 편의를 위한 조합 데코레이터들

/**
 * 고보안 엔드포인트 데코레이터
 *
 * 민감한 엔드포인트에 여러 보안 기능을 한번에 적용합니다.
 */
export function HighSecurity() {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (propertyKey && descriptor) {
      // 메타데이터 설정
      Reflect.defineMetadata('sensitiveOperation', 'high', target, propertyKey);
      Reflect.defineMetadata('securityLog', 'high_security_access', target, propertyKey);
      Reflect.defineMetadata('require2FA', true, target, propertyKey);
      Reflect.defineMetadata('auditLog', 'high_security_operation', target, propertyKey);
      Reflect.defineMetadata('noCache', true, target, propertyKey);
    }
  };
}

/**
 * 파일 업로드 보안 데코레이터
 *
 * 파일 업로드 엔드포인트에 필요한 모든 보안 기능을 적용합니다.
 */
export function SecureFileUpload(options?: {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
}) {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (propertyKey && descriptor) {
      // 메타데이터 설정
      Reflect.defineMetadata('fileSecurityCheck', true, target, propertyKey);
      Reflect.defineMetadata('uploadRestriction', {
        maxFileSize: options?.maxFileSize || 500 * 1024 * 1024, // 500MB
        allowedMimeTypes: options?.allowedMimeTypes,
        maxFiles: options?.maxFiles || 10,
        scanForMalware: true,
      }, target, propertyKey);
      Reflect.defineMetadata('rateLimit', { limit: 10, window: 3600 }, target, propertyKey); // 시간당 10개
      Reflect.defineMetadata('securityLog', 'file_upload', target, propertyKey);
    }
  };
}
