import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import { TimeRestrictionGuard } from '../guards/time-restriction.guard';

/**
 * Planet 시간 제한을 체크하는 데코레이터
 *
 * 사용 예시:
 * @CheckTimeRestriction()
 * @Post(':planetId/messages')
 * async sendMessage(@Param('planetId') planetId: number, ...) {
 *   // 시간 제한에 걸리지 않는 경우에만 실행됨
 * }
 */
export const CheckTimeRestriction = () =>
  applyDecorators(
    UseGuards(AuthGuard), // 사용자 인증 필수
    UseGuards(TimeRestrictionGuard), // 시간 제한 체크
  );

/**
 * 채팅 관련 액션에 적용하는 포괄적 데코레이터
 * - 사용자 인증 체크
 * - 시간 제한 체크
 * - Planet 접근 권한 체크 (1:1 Planet인 경우)
 */
export const ChatAction = () =>
  applyDecorators(UseGuards(AuthGuard), UseGuards(TimeRestrictionGuard));
