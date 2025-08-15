import { UnauthorizedException } from '@nestjs/common';
import { User } from '../../modules/user/user.entity';
import { CurrentUserData } from '../decorators/current-user.decorator';

interface CrudContext {
  request?: {
    user?: CurrentUserData;
    method?: string;
  };
}

/**
 * @foryourdev/nestjs-crud lifecycle hooks용 현재 사용자 추출 헬퍼
 *
 * @param context - CRUD hook의 context 객체
 * @returns 현재 인증된 사용자 정보
 * @throws UnauthorizedException - 사용자 인증 정보가 없는 경우
 *
 * @example
 * ```typescript
 * @BeforeCreate()
 * async preprocessData(entity: SomeEntity, context: any) {
 *   const user = getCurrentUserFromContext(context);
 *   entity.userId = user.id;
 *   return entity;
 * }
 * ```
 */
export function getCurrentUserFromContext(context: CrudContext): User {
  const userData: CurrentUserData | undefined = context.request?.user;

  if (!userData) {
    throw new UnauthorizedException('사용자 인증이 필요합니다.');
  }

  return userData as User;
}

/**
 * @foryourdev/nestjs-crud lifecycle hooks용 현재 사용자 ID 추출 헬퍼
 *
 * @param context - CRUD hook의 context 객체
 * @returns 현재 인증된 사용자의 ID
 * @throws UnauthorizedException - 사용자 인증 정보가 없는 경우
 *
 * @example
 * ```typescript
 * @BeforeCreate()
 * async preprocessData(entity: SomeEntity, context: any) {
 *   const userId = getCurrentUserIdFromContext(context);
 *   entity.createdBy = userId;
 *   return entity;
 * }
 * ```
 */
export function getCurrentUserIdFromContext(context: CrudContext): number {
  const user = getCurrentUserFromContext(context);
  return user.id;
}

/**
 * @foryourdev/nestjs-crud lifecycle hooks용 안전한 현재 사용자 추출 헬퍼
 * 인증되지 않은 사용자의 경우 null을 반환합니다.
 *
 * @param context - CRUD hook의 context 객체
 * @returns 현재 인증된 사용자 정보 또는 null
 *
 * @example
 * ```typescript
 * @BeforeCreate()
 * async preprocessData(entity: SomeEntity, context: any) {
 *   const user = tryGetCurrentUserFromContext(context);
 *   if (user) {
 *     entity.userId = user.id;
 *   }
 *   return entity;
 * }
 * ```
 */
export function tryGetCurrentUserFromContext(
  context: CrudContext,
): User | null {
  try {
    return getCurrentUserFromContext(context);
  } catch {
    return null;
  }
}

/**
 * HTTP 요청 메서드 타입 확인 헬퍼
 *
 * @param context - CRUD hook의 context 객체
 * @returns HTTP 메서드 (GET, POST, PUT, DELETE 등)
 */
export function getRequestMethodFromContext(context: CrudContext): string {
  return context.request?.method || 'UNKNOWN';
}

/**
 * 현재 요청이 특정 HTTP 메서드인지 확인하는 헬퍼
 *
 * @param context - CRUD hook의 context 객체
 * @param method - 확인할 HTTP 메서드
 * @returns 메서드 일치 여부
 *
 * @example
 * ```typescript
 * @BeforeCreate()
 * async preprocessData(entity: SomeEntity, context: any) {
 *   if (isRequestMethod(context, 'POST')) {
 *     // POST 요청일 때만 실행할 로직
 *   }
 *   return entity;
 * }
 * ```
 */
export function isRequestMethod(context: CrudContext, method: string): boolean {
  return (
    getRequestMethodFromContext(context).toUpperCase() === method.toUpperCase()
  );
}
