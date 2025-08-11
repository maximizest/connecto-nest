import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import {
  DirectPlanetPermission,
  DirectPlanetPermissionGuard,
  RequireDirectPlanetPermission,
} from '../guards/direct-planet-permission.guard';

/**
 * 1:1 Planet 접근 권한을 체크하는 복합 데코레이터
 * - 사용자 인증 필수
 * - Planet 소속 여부 확인
 * - 권한별 접근 제어
 */

/**
 * 1:1 Planet 읽기 권한 체크 데코레이터
 * 초대받은 상태에서도 읽기 가능
 */
export const DirectPlanetReadAccess = () =>
  applyDecorators(
    UseGuards(AuthGuard),
    RequireDirectPlanetPermission('read'),
    UseGuards(DirectPlanetPermissionGuard),
  );

/**
 * 1:1 Planet 쓰기 권한 체크 데코레이터
 * 활성 멤버만 가능
 */
export const DirectPlanetWriteAccess = () =>
  applyDecorators(
    UseGuards(AuthGuard),
    RequireDirectPlanetPermission('write'),
    UseGuards(DirectPlanetPermissionGuard),
  );

/**
 * 1:1 Planet 파일 업로드 권한 체크 데코레이터
 * 활성 멤버 + 파일 업로드 설정 확인
 */
export const DirectPlanetUploadAccess = () =>
  applyDecorators(
    UseGuards(AuthGuard),
    RequireDirectPlanetPermission('upload'),
    UseGuards(DirectPlanetPermissionGuard),
  );

/**
 * 커스텀 1:1 Planet 권한 체크 데코레이터
 */
export const DirectPlanetAccess = (permission: DirectPlanetPermission) =>
  applyDecorators(
    UseGuards(AuthGuard),
    RequireDirectPlanetPermission(permission),
    UseGuards(DirectPlanetPermissionGuard),
  );
