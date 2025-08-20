import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { HostGuard } from '../../guards/host.guard';
import { AdminGuard } from '../../guards/admin.guard';

/**
 * 사용자 인증이 필요한 엔드포인트
 * JWT 토큰 검증 + 블랙리스트 + 차단 상태 확인
 */
export const RequireAuth = () => {
  return applyDecorators(
    UseGuards(AuthGuard)
  );
};

/**
 * 호스트 권한이 필요한 엔드포인트
 * Travel의 HOST 또는 플랫폼 ADMIN만 접근 가능
 */
export const RequireHost = () => {
  return applyDecorators(
    UseGuards(HostGuard)
  );
};

/**
 * 관리자 권한이 필요한 엔드포인트
 * 플랫폼 ADMIN만 접근 가능
 */
export const RequireAdmin = () => {
  return applyDecorators(
    UseGuards(AdminGuard)
  );
};

/**
 * 본인 확인이 필요한 엔드포인트
 * 리소스 소유자만 접근 가능
 */
export const RequireOwner = () => {
  return applyDecorators(
    UseGuards(AuthGuard)
    // OwnerGuard는 필요시 추가 구현
  );
};