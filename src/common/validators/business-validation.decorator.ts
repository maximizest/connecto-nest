import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 날짜 순서 검증 (시작일 < 종료일)
 */
@ValidatorConstraint({ name: 'isValidDateOrder', async: false })
export class IsValidDateOrderConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const { startDate, endDate } = object;

    if (!startDate || !endDate) {
      return true; // 다른 검증에서 처리
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // 날짜 유효성 검증
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    // 순서 검증: 시작일 <= 종료일
    if (start > end) {
      return false;
    }

    // 종료일은 현재보다 미래여야 함
    if (end <= now) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '날짜 순서가 올바르지 않습니다. (시작일 ≤ 종료일, 종료일은 미래)';
  }
}

/**
 * Travel 설정 검증
 */
@ValidatorConstraint({ name: 'isValidTravelSettings', async: false })
export class IsValidTravelSettingsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== 'object') {
      return true; // 선택적 필드
    }

    const settings = value;

    // 허용된 설정 키 검증
    const allowedKeys = [
      'autoAcceptInvites',
      'allowGuestMessages',
      'messageRetentionDays',
      'fileUploadEnabled',
      'maxFileSize',
      'timezone',
      'language',
      'notifications',
    ];

    const settingKeys = Object.keys(settings);
    const hasInvalidKey = settingKeys.some((key) => !allowedKeys.includes(key));

    if (hasInvalidKey) {
      return false;
    }

    // 개별 설정 검증
    if (settings.messageRetentionDays !== undefined) {
      if (
        typeof settings.messageRetentionDays !== 'number' ||
        settings.messageRetentionDays < 1 ||
        settings.messageRetentionDays > 365
      ) {
        return false;
      }
    }

    if (settings.maxFileSize !== undefined) {
      if (
        typeof settings.maxFileSize !== 'number' ||
        settings.maxFileSize < 1 ||
        settings.maxFileSize > 500 * 1024 * 1024
      ) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '유효하지 않은 Travel 설정입니다.';
  }
}

/**
 * Planet 시간 제한 설정 검증
 */
@ValidatorConstraint({ name: 'isValidTimeRestriction', async: false })
export class IsValidTimeRestrictionConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== 'object') {
      return true; // 선택적 필드
    }

    const { type, startTime, endTime, allowedDays, timezone } = value;

    // 타입 검증
    const validTypes = ['none', 'daily', 'weekly', 'custom'];
    if (!validTypes.includes(type)) {
      return false;
    }

    // 타입별 검증
    if (type === 'daily' || type === 'weekly') {
      if (!startTime || !endTime) return false;

      // 시간 형식 검증 (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return false;
      }
    }

    if (type === 'weekly' && allowedDays) {
      if (!Array.isArray(allowedDays)) return false;

      const validDays = [0, 1, 2, 3, 4, 5, 6]; // 0=일요일, 6=토요일
      const hasInvalidDay = allowedDays.some((day) => !validDays.includes(day));
      if (hasInvalidDay) return false;
    }

    if (timezone) {
      // 간단한 timezone 검증 (더 정교한 검증 가능)
      if (typeof timezone !== 'string' || timezone.length === 0) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '유효하지 않은 시간 제한 설정입니다.';
  }
}

/**
 * 멤버 제한 검증
 */
@ValidatorConstraint({ name: 'isValidMemberLimit', async: false })
export class IsValidMemberLimitConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const { type, maxMembers } = object;

    if (maxMembers === undefined || maxMembers === null) {
      return true; // 선택적 필드
    }

    if (typeof maxMembers !== 'number' || maxMembers < 1) {
      return false;
    }

    // Planet 타입별 멤버 제한
    if (type === 'DIRECT' && maxMembers !== 2) {
      return false;
    }

    if (type === 'GROUP' && (maxMembers < 2 || maxMembers > 1000)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '멤버 제한이 유효하지 않습니다. (1:1: 2명, 그룹: 2-1000명)';
  }
}

/**
 * 데코레이터 함수들
 */
export function IsValidDateOrder(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateOrderConstraint,
    });
  };
}

export function IsValidTravelSettings(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTravelSettingsConstraint,
    });
  };
}

export function IsValidTimeRestriction(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimeRestrictionConstraint,
    });
  };
}

export function IsValidMemberLimit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMemberLimitConstraint,
    });
  };
}
