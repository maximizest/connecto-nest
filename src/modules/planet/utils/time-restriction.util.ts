import { BadRequestException } from '@nestjs/common';
import { Planet, TimeRestrictionType } from '../planet.entity';

/**
 * 시간 제한 설정 인터페이스
 */
export interface TimeRestrictionSetting {
  type: TimeRestrictionType;
  startTime?: string; // HH:mm 형식
  endTime?: string; // HH:mm 형식
  daysOfWeek?: number[]; // 0(일) ~ 6(토)
  timezone?: string; // 시간대
  customSchedule?: {
    startDate: Date;
    endDate: Date;
    recurring?: boolean;
  }[];
}

/**
 * Planet 시간 제한 관리 유틸리티
 * 시간 제한 설정, 검증, 변환 등의 기능 제공
 */
export class TimeRestrictionUtil {
  /**
   * 시간 제한 설정 검증
   */
  static validateTimeRestriction(setting: TimeRestrictionSetting): void {
    switch (setting.type) {
      case TimeRestrictionType.DAILY:
        this.validateDailyRestriction(setting);
        break;

      case TimeRestrictionType.WEEKLY:
        this.validateWeeklyRestriction(setting);
        break;

      case TimeRestrictionType.CUSTOM:
        this.validateCustomRestriction(setting);
        break;

      case TimeRestrictionType.NONE:
        // 제한 없음 - 검증 불필요
        break;

      default:
        throw new BadRequestException('유효하지 않은 시간 제한 타입입니다.');
    }
  }

  /**
   * 일일 시간 제한 검증
   */
  private static validateDailyRestriction(
    setting: TimeRestrictionSetting,
  ): void {
    if (!setting.startTime || !setting.endTime) {
      throw new BadRequestException(
        '일일 제한에는 시작 시간과 종료 시간이 필요합니다.',
      );
    }

    if (
      !this.isValidTimeFormat(setting.startTime) ||
      !this.isValidTimeFormat(setting.endTime)
    ) {
      throw new BadRequestException(
        '시간 형식은 HH:mm 이어야 합니다 (예: 09:00).',
      );
    }

    if (setting.startTime >= setting.endTime) {
      throw new BadRequestException('시작 시간은 종료 시간보다 빨라야 합니다.');
    }
  }

  /**
   * 주간 시간 제한 검증
   */
  private static validateWeeklyRestriction(
    setting: TimeRestrictionSetting,
  ): void {
    if (!setting.daysOfWeek || setting.daysOfWeek.length === 0) {
      throw new BadRequestException(
        '주간 제한에는 최소 하나의 요일을 선택해야 합니다.',
      );
    }

    // 요일 범위 검증 (0-6)
    const invalidDays = setting.daysOfWeek.filter((day) => day < 0 || day > 6);
    if (invalidDays.length > 0) {
      throw new BadRequestException(
        '요일은 0(일요일)부터 6(토요일) 사이의 값이어야 합니다.',
      );
    }

    // 일일 제한 검증도 수행
    this.validateDailyRestriction(setting);
  }

  /**
   * 커스텀 시간 제한 검증
   */
  private static validateCustomRestriction(
    setting: TimeRestrictionSetting,
  ): void {
    if (!setting.customSchedule || setting.customSchedule.length === 0) {
      throw new BadRequestException(
        '커스텀 제한에는 최소 하나의 스케줄이 필요합니다.',
      );
    }

    for (const schedule of setting.customSchedule) {
      if (
        !(schedule.startDate instanceof Date) ||
        !(schedule.endDate instanceof Date)
      ) {
        throw new BadRequestException('스케줄 날짜는 Date 타입이어야 합니다.');
      }

      if (schedule.startDate >= schedule.endDate) {
        throw new BadRequestException(
          '시작 날짜는 종료 날짜보다 빨라야 합니다.',
        );
      }

      if (schedule.startDate < new Date()) {
        throw new BadRequestException('과거 날짜는 설정할 수 없습니다.');
      }
    }
  }

  /**
   * 시간 형식 검증 (HH:mm)
   */
  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * 편의 메서드: 일일 시간 제한 설정 생성
   */
  static createDailyRestriction(
    startTime: string,
    endTime: string,
    timezone?: string,
  ): TimeRestrictionSetting {
    const setting: TimeRestrictionSetting = {
      type: TimeRestrictionType.DAILY,
      startTime,
      endTime,
      timezone: timezone || 'Asia/Seoul',
    };

    this.validateTimeRestriction(setting);
    return setting;
  }

  /**
   * 편의 메서드: 주간 시간 제한 설정 생성
   */
  static createWeeklyRestriction(
    daysOfWeek: number[],
    startTime: string,
    endTime: string,
    timezone?: string,
  ): TimeRestrictionSetting {
    const setting: TimeRestrictionSetting = {
      type: TimeRestrictionType.WEEKLY,
      daysOfWeek,
      startTime,
      endTime,
      timezone: timezone || 'Asia/Seoul',
    };

    this.validateTimeRestriction(setting);
    return setting;
  }

  /**
   * 편의 메서드: 커스텀 시간 제한 설정 생성
   */
  static createCustomRestriction(
    schedules: { startDate: Date; endDate: Date; recurring?: boolean }[],
  ): TimeRestrictionSetting {
    const setting: TimeRestrictionSetting = {
      type: TimeRestrictionType.CUSTOM,
      customSchedule: schedules,
    };

    this.validateTimeRestriction(setting);
    return setting;
  }

  /**
   * 편의 메서드: 제한 없음 설정 생성
   */
  static createNoRestriction(): TimeRestrictionSetting {
    return {
      type: TimeRestrictionType.NONE,
    };
  }

  /**
   * Planet에 시간 제한 적용
   */
  static applyTimeRestriction(
    planet: Planet,
    setting: TimeRestrictionSetting,
  ): void {
    this.validateTimeRestriction(setting);
    planet.setTimeRestriction(setting);
  }

  /**
   * Planet의 시간 제한 제거
   */
  static removeTimeRestriction(planet: Planet): void {
    planet.removeTimeRestriction();
  }

  /**
   * 시간 제한 정보를 사용자 친화적인 문자열로 변환
   */
  static formatTimeRestriction(setting: TimeRestrictionSetting): string {
    switch (setting.type) {
      case TimeRestrictionType.NONE:
        return '시간 제한 없음';

      case TimeRestrictionType.DAILY:
        return `매일 ${setting.startTime} ~ ${setting.endTime}`;

      case TimeRestrictionType.WEEKLY:
        const days = setting.daysOfWeek
          ?.map((day) => {
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            return dayNames[day];
          })
          .join(', ');
        return `${days}요일 ${setting.startTime} ~ ${setting.endTime}`;

      case TimeRestrictionType.CUSTOM:
        const scheduleCount = setting.customSchedule?.length || 0;
        return `커스텀 스케줄 (${scheduleCount}개 일정)`;

      default:
        return '알 수 없는 제한 타입';
    }
  }

  /**
   * 시간 제한까지 남은 시간 계산 (분 단위)
   */
  static getMinutesUntilNextChat(planet: Planet): number | null {
    const nextChatTime = planet.getNextChatTime();
    if (!nextChatTime) {
      return null; // 제한 없음
    }

    const now = new Date();
    const diffMs = nextChatTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }

  /**
   * 현재 채팅 가능한지와 다음 시간까지의 정보 반환
   */
  static getChatAvailabilityInfo(planet: Planet): {
    canChat: boolean;
    nextChatTime?: Date;
    minutesUntilNext?: number;
    restrictionDescription?: string;
  } {
    const canChat = planet.isChatAllowed();
    const nextChatTime = planet.getNextChatTime();
    const minutesUntilNext = this.getMinutesUntilNextChat(planet);
    const restrictionDescription = planet.timeRestriction
      ? this.formatTimeRestriction(planet.timeRestriction)
      : undefined;

    return {
      canChat,
      nextChatTime: nextChatTime || undefined,
      minutesUntilNext: minutesUntilNext || undefined,
      restrictionDescription,
    };
  }
}
