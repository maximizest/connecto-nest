import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// 파일 크기 제한 (바이트)
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_IMAGE_SIZE: 50 * 1024 * 1024, // 50MB (이미지는 더 작게)
  MAX_THUMBNAIL_SIZE: 5 * 1024 * 1024, // 5MB (썸네일)
} as const;

// 허용된 파일 타입
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/avi', 'video/mov', 'video/webm'],
  AUDIO: ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
  ],
} as const;

export const ALL_ALLOWED_TYPES: string[] = [
  ...ALLOWED_FILE_TYPES.IMAGE,
  ...ALLOWED_FILE_TYPES.VIDEO,
  ...ALLOWED_FILE_TYPES.AUDIO,
  ...ALLOWED_FILE_TYPES.DOCUMENT,
];

/**
 * 파일 크기 검증 제약조건
 */
@ValidatorConstraint({ name: 'isValidFileSize', async: false })
export class IsValidFileSizeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== 'object') {
      return true; // 다른 검증에서 처리
    }

    const { fileSize, fileType } = value;

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return false;
    }

    // 파일 타입별 크기 제한
    if (fileType && ALLOWED_FILE_TYPES.IMAGE.includes(fileType)) {
      return fileSize <= FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
    }

    // 기본 크기 제한 (500MB)
    return fileSize <= FILE_SIZE_LIMITS.MAX_FILE_SIZE;
  }

  defaultMessage(args: ValidationArguments) {
    return '파일 크기가 허용된 범위를 초과합니다. (최대 500MB, 이미지 50MB)';
  }
}

/**
 * 파일 타입 검증 제약조건
 */
@ValidatorConstraint({ name: 'isValidFileType', async: false })
export class IsValidFileTypeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== 'object') {
      return true; // 다른 검증에서 처리
    }

    const { fileType } = value;

    if (typeof fileType !== 'string') {
      return false;
    }

    return ALL_ALLOWED_TYPES.includes(fileType);
  }

  defaultMessage(args: ValidationArguments) {
    return '허용되지 않은 파일 타입입니다.';
  }
}

/**
 * 파일 이름 검증 제약조건
 */
@ValidatorConstraint({ name: 'isValidFileName', async: false })
export class IsValidFileNameConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || typeof value !== 'object') {
      return true; // 다른 검증에서 처리
    }

    const { fileName } = value;

    if (typeof fileName !== 'string' || fileName.trim().length === 0) {
      return false;
    }

    // 파일명 보안 검증 (위험한 문자 제거)
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g;
    const hasExtension = /\.[a-zA-Z0-9]{1,10}$/.test(fileName);

    return (
      !dangerousChars.test(fileName) && hasExtension && fileName.length <= 255
    );
  }

  defaultMessage(args: ValidationArguments) {
    return '유효하지 않은 파일명입니다. (확장자 포함, 255자 이하, 특수문자 제한)';
  }
}

/**
 * 파일 메타데이터 종합 검증 데코레이터
 */
export function IsValidFileMetadata(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // 선택적 필드

          // 기본 구조 검증
          if (typeof value !== 'object') return false;

          const { fileName, fileType, fileSize } = value;

          // 필수 필드 검증
          if (!fileName || !fileType || !fileSize) return false;

          // 개별 검증
          const fileSizeValidator = new IsValidFileSizeConstraint();
          const fileTypeValidator = new IsValidFileTypeConstraint();
          const fileNameValidator = new IsValidFileNameConstraint();

          return (
            fileSizeValidator.validate(value, args) &&
            fileTypeValidator.validate(value, args) &&
            fileNameValidator.validate(value, args)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return '파일 메타데이터가 유효하지 않습니다.';
        },
      },
    });
  };
}

/**
 * 이미지/비디오 차원 검증 데코레이터
 */
export function IsValidMediaDimensions(
  maxWidth = 4096,
  maxHeight = 4096,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxWidth, maxHeight],
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') return true;

          const { width, height, fileType } = value;
          const [maxW, maxH] = args.constraints;

          // 이미지나 비디오가 아니면 차원 검증 스킵
          if (
            !fileType ||
            (!ALLOWED_FILE_TYPES.IMAGE.includes(fileType) &&
              !ALLOWED_FILE_TYPES.VIDEO.includes(fileType))
          ) {
            return true;
          }

          // 차원이 제공된 경우에만 검증
          if (width && height) {
            return (
              typeof width === 'number' &&
              typeof height === 'number' &&
              width > 0 &&
              height > 0 &&
              width <= maxW &&
              height <= maxH
            );
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxW, maxH] = args.constraints;
          return `미디어 차원이 유효하지 않습니다. (최대 ${maxW}x${maxH})`;
        },
      },
    });
  };
}
