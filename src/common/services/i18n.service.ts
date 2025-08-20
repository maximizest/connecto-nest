import { Injectable } from '@nestjs/common';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';

/**
 * i18n 서비스 래퍼
 * 국제화된 메시지를 쉽게 사용하기 위한 서비스
 */
@Injectable()
export class I18nServiceWrapper {
  constructor(private readonly i18n: NestI18nService) {}

  /**
   * 에러 메시지 번역
   */
  translateError(key: string, args?: any): string {
    return this.i18n.t(`errors.${key}`, {
      lang: I18nContext.current()?.lang || 'ko',
      args,
    });
  }

  /**
   * 성공 메시지 번역
   */
  translateSuccess(key: string, args?: any): string {
    return this.i18n.t(`success.${key}`, {
      lang: I18nContext.current()?.lang || 'ko',
      args,
    });
  }

  /**
   * 알림 메시지 번역
   */
  translateNotification(key: string, args?: any): string {
    return this.i18n.t(`notifications.${key}`, {
      lang: I18nContext.current()?.lang || 'ko',
      args,
    });
  }

  /**
   * 유효성 검사 메시지 번역
   */
  translateValidation(key: string, args?: any): string {
    return this.i18n.t(`validation.${key}`, {
      lang: I18nContext.current()?.lang || 'ko',
      args,
    });
  }

  /**
   * 일반 메시지 번역
   */
  translate(key: string, args?: any): string {
    return this.i18n.t(key, {
      lang: I18nContext.current()?.lang || 'ko',
      args,
    });
  }
}
