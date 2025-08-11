import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

/**
 * 커스텀 검증 예외 포맷터
 */
function formatValidationErrors(errors: ValidationError[]): any {
  return errors.reduce((acc, error) => {
    const property = error.property;
    const constraints = error.constraints || {};
    const children = error.children || [];

    // 중첩된 객체 검증 오류 처리
    if (children.length > 0) {
      acc[property] = formatValidationErrors(children);
    } else {
      acc[property] = Object.values(constraints);
    }

    return acc;
  }, {});
}

/**
 * 글로벌 검증 파이프 설정
 */
export const globalValidationPipe = new ValidationPipe({
  // 데이터 변환 활성화
  transform: true,

  // 명시되지 않은 속성 제거
  whitelist: true,

  // 명시되지 않은 속성이 있으면 오류 발생
  forbidNonWhitelisted: true,

  // 상세한 오류 메시지 활성화
  disableErrorMessages: false,

  // 첫 번째 오류에서 멈추지 않고 모든 검증 수행
  stopAtFirstError: false,

  // 커스텀 오류 메시지 포맷터
  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    const formattedErrors = formatValidationErrors(validationErrors);

    return new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  },

  // 변환 옵션
  transformOptions: {
    // 암시적 변환 활성화
    enableImplicitConversion: true,

    // 순환 참조 방지
    enableCircularCheck: true,
  },

  // 검증 옵션
  validationError: {
    // 대상 객체 포함하지 않음 (민감한 정보 방지)
    target: false,

    // 값 포함하지 않음 (민감한 정보 방지)
    value: false,
  },
});

/**
 * 파일 업로드용 검증 파이프 (더 관대한 설정)
 */
export const fileUploadValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false, // 파일 업로드 시 추가 메타데이터 허용
  disableErrorMessages: false,
  stopAtFirstError: false,

  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    const formattedErrors = formatValidationErrors(validationErrors);

    return new BadRequestException({
      statusCode: 400,
      message: 'File upload validation failed',
      error: 'Bad Request',
      details: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * WebSocket용 검증 파이프
 */
export const websocketValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: false,
  stopAtFirstError: true, // WebSocket에서는 첫 번째 오류에서 중단

  exceptionFactory: (validationErrors: ValidationError[] = []) => {
    const formattedErrors = formatValidationErrors(validationErrors);

    // WebSocket에서는 일반 Error를 던집니다
    const errorMessage = `Validation failed: ${JSON.stringify(formattedErrors)}`;
    return new Error(errorMessage);
  },
});
