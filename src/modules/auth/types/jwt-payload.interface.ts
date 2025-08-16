/**
 * JWT 토큰 페이로드
 */
export interface JwtPayload {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}
