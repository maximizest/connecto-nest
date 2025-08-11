import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * 기본 페이지네이션 쿼리 DTO
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sort?: string = '-createdAt'; // 기본: 최신순

  @IsOptional()
  @IsString()
  fields?: string; // 선택적 필드 반환
}

/**
 * 커서 기반 페이지네이션 쿼리 DTO
 * 무한 스크롤과 실시간 업데이트에 최적화
 */
export class CursorPaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string; // 다음 페이지를 위한 커서

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'desc'; // 정렬 방향

  @IsOptional()
  @IsString()
  sortField?: string = 'createdAt'; // 정렬 기준 필드
}

/**
 * 메시지 전용 페이지네이션 쿼리 DTO
 */
export class MessagePaginationQueryDto extends CursorPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  planetId?: number; // 필수: Planet ID

  @IsOptional()
  @IsDateString()
  beforeDate?: string; // 특정 날짜 이전 메시지만

  @IsOptional()
  @IsDateString()
  afterDate?: string; // 특정 날짜 이후 메시지만

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  beforeMessageId?: number; // 특정 메시지 이전

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  afterMessageId?: number; // 특정 메시지 이후

  @IsOptional()
  @Type(() => Boolean)
  includeDeleted?: boolean = false; // 삭제된 메시지 포함 여부

  @IsOptional()
  @Type(() => Boolean)
  includeSystem?: boolean = true; // 시스템 메시지 포함 여부
}

/**
 * 기본 페이지네이션 응답 DTO
 */
export class PaginationResponseDto<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(data: T[], page: number, limit: number, total: number) {
    this.data = data;
    this.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}

/**
 * 커서 기반 페이지네이션 응답 DTO
 */
export class CursorPaginationResponseDto<T> {
  data: T[];
  pagination: {
    nextCursor?: string;
    prevCursor?: string;
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
    totalCount?: number; // 옵션: 전체 개수 (성능상 부담)
  };

  constructor(
    data: T[],
    nextCursor?: string,
    prevCursor?: string,
    limit: number = 20,
    totalCount?: number,
  ) {
    this.data = data;
    this.pagination = {
      nextCursor,
      prevCursor,
      hasNext: !!nextCursor,
      hasPrev: !!prevCursor,
      limit,
      totalCount,
    };
  }
}

/**
 * 메시지 페이지네이션 메타데이터
 */
export class MessagePaginationMeta {
  planetId: number;
  totalMessages?: number;
  unreadCount?: number;
  oldestMessageDate?: Date;
  newestMessageDate?: Date;
  messageTypes: string[];

  constructor(
    planetId: number,
    options: {
      totalMessages?: number;
      unreadCount?: number;
      oldestMessageDate?: Date;
      newestMessageDate?: Date;
      messageTypes?: string[];
    } = {},
  ) {
    this.planetId = planetId;
    this.totalMessages = options.totalMessages;
    this.unreadCount = options.unreadCount;
    this.oldestMessageDate = options.oldestMessageDate;
    this.newestMessageDate = options.newestMessageDate;
    this.messageTypes = options.messageTypes || [];
  }
}

/**
 * 검색 결과 페이지네이션 응답 DTO
 */
export class SearchPaginationResponseDto<
  T,
> extends CursorPaginationResponseDto<T> {
  searchMeta: {
    query?: string;
    filters: Record<string, any>;
    searchTime: number; // 검색 소요 시간 (ms)
    totalMatches?: number;
    suggestions?: string[];
  };

  constructor(
    data: T[],
    searchMeta: {
      query?: string;
      filters: Record<string, any>;
      searchTime: number;
      totalMatches?: number;
      suggestions?: string[];
    },
    nextCursor?: string,
    prevCursor?: string,
    limit: number = 20,
  ) {
    super(data, nextCursor, prevCursor, limit);
    this.searchMeta = searchMeta;
  }
}
