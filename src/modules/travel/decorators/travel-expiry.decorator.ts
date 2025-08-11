import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import { TravelExpiryGuard } from '../guards/travel-expiry.guard';

/**
 * Travel 만료 상태를 체크하는 데코레이터
 * - 사용자 인증 필수
 * - Travel이 만료되지 않았는지 확인
 * - Travel이 활성 상태인지 확인
 *
 * 사용 예시:
 * @CheckTravelExpiry()
 * @Post(':travelId/planets')
 * async createPlanet(@Param('travelId') travelId: number, ...) {
 *   // Travel이 활성이고 만료되지 않은 경우에만 실행됨
 * }
 */
export const CheckTravelExpiry = () =>
  applyDecorators(
    UseGuards(AuthGuard), // 사용자 인증 필수
    UseGuards(TravelExpiryGuard), // Travel 만료 체크
  );

/**
 * Travel 관련 액션에 적용하는 포괄적 데코레이터
 * - 사용자 인증 체크
 * - Travel 만료 상태 체크
 */
export const TravelAction = () =>
  applyDecorators(UseGuards(AuthGuard), UseGuards(TravelExpiryGuard));
