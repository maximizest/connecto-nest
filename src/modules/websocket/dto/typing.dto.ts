import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 타이핑 상태 응답 정보
 */
export interface TypingStatusResponse {
  planetId: number;
  users: TypingUserInfo[];
  typingUsers: TypingUserInfo[];
  totalTyping: number;
  totalTypingCount: number;
  timestamp: Date;
}

/**
 * 타이핑 중인 사용자 정보
 */
export interface TypingUserInfo {
  userId: number;
  userName: string;
  deviceType?: string;
  typingType?: string;
  startedAt: Date;
  contentLength?: number;
  estimatedDuration?: number;
}

/**
 * 고급 타이핑 DTO
 */
export class AdvancedTypingDto {
  @IsNumber()
  planetId: number;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  typingType?: string;

  @IsOptional()
  @IsNumber()
  contentLength?: number;
}

/**
 * 타이핑 분석 정보
 */
export interface TypingAnalytics {
  planetId?: number;
  averageTypingDuration: number;
  peakConcurrentTypers: number;
  totalTypingEvents: number;
  mostActiveHour: number;
  planetActivityScore: number;
  activeTypingUsers?: number;
  typingPatterns?: {
    hourly: Record<number, number>;
    deviceType: Record<string, number>;
    typingType: Record<string, number>;
  };
}

/**
 * 타이핑 시작 DTO
 */
export class StartTypingDto {
  @IsNumber()
  planetId: number;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  typingType?: string;

  @IsOptional()
  @IsNumber()
  contentLength?: number;
}

/**
 * 타이핑 중지 DTO
 */
export class StopTypingDto {
  @IsNumber()
  planetId: number;

  @IsOptional()
  @IsBoolean()
  messageSent?: boolean;

  @IsOptional()
  @IsNumber()
  finalContentLength?: number;
}

/**
 * 타이핑 상태 조회 DTO
 */
export class GetTypingStatusDto {
  @IsNumber()
  planetId: number;

  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean;
}
