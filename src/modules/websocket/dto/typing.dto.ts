import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 타이핑 상태 DTO
 */
export class TypingDto {
  @IsNumber()
  planetId: number;
}

/**
 * 고급 타이핑 상태 DTO
 */
export class AdvancedTypingDto {
  @IsNumber()
  planetId: number;

  @IsBoolean()
  @IsOptional()
  isTyping?: boolean;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsString()
  @IsOptional()
  typingType?: 'text' | 'voice' | 'file' | 'image'; // 타이핑 유형

  @IsNumber()
  @IsOptional()
  contentLength?: number; // 작성 중인 텍스트 길이

  @IsString()
  @IsOptional()
  lastTypedWord?: string; // 마지막 입력 단어 (옵션)
}

/**
 * 타이핑 상태 응답 DTO
 */
export interface TypingStatusResponse {
  planetId: number;
  typingUsers: TypingUserInfo[];
  totalTypingCount: number;
  timestamp: Date;
}

/**
 * 타이핑 중인 사용자 정보
 */
export interface TypingUserInfo {
  userId: number;
  userName: string;
  avatarUrl?: string;
  deviceType?: string;
  typingType?: string;
  startedAt: Date;
  estimatedDuration?: number; // 예상 타이핑 시간 (ms)
  contentLength?: number;
}

/**
 * 타이핑 통계 정보
 */
export interface TypingAnalytics {
  planetId: number;
  averageTypingDuration: number; // 평균 타이핑 시간
  totalTypingEvents: number; // 총 타이핑 이벤트
  activeTypingUsers: number; // 현재 타이핑 중인 사용자 수
  typingPatterns: {
    hourly: Record<number, number>; // 시간대별 타이핑 패턴
    deviceType: Record<string, number>; // 디바이스별 타이핑 통계
    typingType: Record<string, number>; // 타이핑 유형별 통계
  };
}
