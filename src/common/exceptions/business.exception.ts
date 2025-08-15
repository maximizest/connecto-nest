import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Travel 관련 예외
 */
export class TravelNotFoundException extends NotFoundException {
  constructor(travelId?: number | string) {
    super(
      travelId
        ? `ID ${travelId}에 해당하는 Travel을 찾을 수 없습니다.`
        : 'Travel을 찾을 수 없습니다.',
      'TRAVEL_NOT_FOUND',
    );
  }
}

export class TravelExpiredException extends ForbiddenException {
  constructor(travelId?: number | string, endDate?: Date) {
    const message = endDate
      ? `Travel이 ${endDate.toLocaleDateString('ko-KR')}에 만료되었습니다.`
      : 'Travel이 만료되었습니다.';

    super(message, 'TRAVEL_EXPIRED');
  }
}

export class TravelAccessDeniedException extends ForbiddenException {
  constructor(reason = '해당 Travel에 접근할 권한이 없습니다.') {
    super(reason, 'TRAVEL_ACCESS_DENIED');
  }
}

export class TravelCapacityExceededException extends ConflictException {
  constructor(currentCount: number, maxCount: number) {
    super(
      `Travel의 최대 용량을 초과했습니다. (현재: ${currentCount}, 최대: ${maxCount})`,
      'TRAVEL_CAPACITY_EXCEEDED',
    );
  }
}

export class TravelInviteCodeInvalidException extends BadRequestException {
  constructor() {
    super('유효하지 않은 초대 코드입니다.', 'TRAVEL_INVITE_CODE_INVALID');
  }
}

/**
 * Planet 관련 예외
 */
export class PlanetNotFoundException extends NotFoundException {
  constructor(planetId?: number | string) {
    super(
      planetId
        ? `ID ${planetId}에 해당하는 Planet을 찾을 수 없습니다.`
        : 'Planet을 찾을 수 없습니다.',
      'PLANET_NOT_FOUND',
    );
  }
}

export class PlanetAccessDeniedException extends ForbiddenException {
  constructor(reason = '해당 Planet에 접근할 권한이 없습니다.') {
    super(reason, 'PLANET_ACCESS_DENIED');
  }
}

export class PlanetInactiveException extends ForbiddenException {
  constructor() {
    super('비활성화된 Planet입니다.', 'PLANET_INACTIVE');
  }
}

export class PlanetTimeRestrictionException extends ForbiddenException {
  constructor(nextAvailableTime?: Date) {
    const message = nextAvailableTime
      ? `현재는 채팅할 수 있는 시간이 아닙니다. 다음 채팅 가능 시간: ${nextAvailableTime.toLocaleString('ko-KR')}`
      : '현재는 채팅할 수 있는 시간이 아닙니다.';

    super(message, 'PLANET_TIME_RESTRICTED');
  }
}

export class PlanetCapacityExceededException extends ConflictException {
  constructor(currentCount: number, maxCount: number) {
    super(
      `Planet의 최대 멤버 수를 초과했습니다. (현재: ${currentCount}, 최대: ${maxCount})`,
      'PLANET_CAPACITY_EXCEEDED',
    );
  }
}

/**
 * 메시지 관련 예외
 */
export class MessageNotFoundException extends NotFoundException {
  constructor(messageId?: number | string) {
    super(
      messageId
        ? `ID ${messageId}에 해당하는 메시지를 찾을 수 없습니다.`
        : '메시지를 찾을 수 없습니다.',
      'MESSAGE_NOT_FOUND',
    );
  }
}

export class MessageEditPermissionException extends ForbiddenException {
  constructor() {
    super(
      '본인이 작성한 메시지만 수정할 수 있습니다.',
      'MESSAGE_EDIT_PERMISSION_DENIED',
    );
  }
}

export class MessageDeletePermissionException extends ForbiddenException {
  constructor() {
    super(
      '본인이 작성한 메시지만 삭제할 수 있습니다.',
      'MESSAGE_DELETE_PERMISSION_DENIED',
    );
  }
}

export class MessageAlreadyDeletedException extends ConflictException {
  constructor() {
    super('이미 삭제된 메시지입니다.', 'MESSAGE_ALREADY_DELETED');
  }
}

export class MessageTooLongException extends BadRequestException {
  constructor(currentLength: number, maxLength: number) {
    super(
      `메시지가 너무 깁니다. (현재: ${currentLength}자, 최대: ${maxLength}자)`,
      'MESSAGE_TOO_LONG',
    );
  }
}

/**
 * 파일 업로드 관련 예외
 */
export class FileUploadException extends BadRequestException {
  constructor(message: string, code: string = 'FILE_UPLOAD_ERROR') {
    super(message, code);
  }
}

export class FileSizeExceededException extends PayloadTooLargeException {
  constructor(currentSize: number, maxSize: number) {
    const formatSize = (bytes: number) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)}MB`;
    };

    super(
      `파일 크기가 제한을 초과했습니다. (현재: ${formatSize(currentSize)}, 최대: ${formatSize(maxSize)})`,
      'FILE_SIZE_EXCEEDED',
    );
  }
}

export class FileTypeNotSupportedException extends BadRequestException {
  constructor(fileType: string, allowedTypes: string[]) {
    super(
      `지원하지 않는 파일 형식입니다. (업로드: ${fileType}, 허용: ${allowedTypes.join(', ')})`,
      'FILE_TYPE_NOT_SUPPORTED',
    );
  }
}

export class FileUploadFailedException extends ServiceUnavailableException {
  constructor(reason?: string) {
    super(
      reason
        ? `파일 업로드에 실패했습니다: ${reason}`
        : '파일 업로드에 실패했습니다.',
      'FILE_UPLOAD_FAILED',
    );
  }
}

export class FileProcessingFailedException extends UnprocessableEntityException {
  constructor(reason?: string) {
    super(
      reason
        ? `파일 처리에 실패했습니다: ${reason}`
        : '파일 처리에 실패했습니다.',
      'FILE_PROCESSING_FAILED',
    );
  }
}

export class VideoProcessingFailedException extends UnprocessableEntityException {
  constructor(reason?: string) {
    super(
      reason
        ? `비디오 처리에 실패했습니다: ${reason}`
        : '비디오 처리에 실패했습니다.',
      'VIDEO_PROCESSING_FAILED',
    );
  }
}

/**
 * 사용자 관련 예외
 */
export class UserBannedException extends ForbiddenException {
  constructor(reason?: string, bannedUntil?: Date) {
    let message = '차단된 사용자입니다.';

    if (reason) {
      message += ` 사유: ${reason}`;
    }

    if (bannedUntil) {
      message += ` 해제 시간: ${bannedUntil.toLocaleString('ko-KR')}`;
    }

    super(message, 'USER_BANNED');
  }
}

export class UserNotMemberException extends ForbiddenException {
  constructor(type: 'travel' | 'planet') {
    super(
      type === 'travel' ? 'Travel 멤버가 아닙니다.' : 'Planet 멤버가 아닙니다.',
      type === 'travel' ? 'USER_NOT_TRAVEL_MEMBER' : 'USER_NOT_PLANET_MEMBER',
    );
  }
}

/**
 * 레이트 리밋 관련 예외
 */
export class RateLimitExceededException extends ConflictException {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `요청 한도를 초과했습니다. ${retryAfter}초 후 다시 시도하세요.`
      : '요청 한도를 초과했습니다.';

    super(message, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 캐시 관련 예외
 */
export class CacheServiceException extends ServiceUnavailableException {
  constructor(operation: string) {
    super(
      `캐시 서비스 오류가 발생했습니다: ${operation}`,
      'CACHE_SERVICE_ERROR',
    );
  }
}

/**
 * 외부 서비스 관련 예외
 */
export class ExternalServiceException extends ServiceUnavailableException {
  constructor(serviceName: string, reason?: string) {
    super(
      reason
        ? `${serviceName} 서비스 오류: ${reason}`
        : `${serviceName} 서비스를 사용할 수 없습니다.`,
      'EXTERNAL_SERVICE_ERROR',
    );
  }
}
