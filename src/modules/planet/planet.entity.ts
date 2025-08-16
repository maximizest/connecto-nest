import {
  IsDateString,
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Travel } from '../travel/travel.entity';

/**
 * Planet 타입 (채팅방 유형)
 */
export enum PlanetType {
  GROUP = 'group', // 단체 채팅
  DIRECT = 'direct', // 1:1 채팅
  ANNOUNCEMENT = 'announcement', // 공지사항
}

/**
 * Planet 상태
 */
export enum PlanetStatus {
  ACTIVE = 'active', // 활성
  INACTIVE = 'inactive', // 비활성
}

/**
 * 시간 제한 타입
 */
export enum TimeRestrictionType {
  NONE = 'none', // 제한 없음
  DAILY = 'daily', // 매일 특정 시간
  WEEKLY = 'weekly', // 매주 특정 요일
  CUSTOM = 'custom', // 사용자 정의
}

/**
 * 시간 제한 설정 인터페이스
 */
interface TimeRestriction {
  type: TimeRestrictionType;
  startTime?: string; // HH:mm 형식
  endTime?: string; // HH:mm 형식
  daysOfWeek?: number[]; // 0(일) ~ 6(토)
  timezone?: string; // 시간대
  customSchedule?: {
    // 사용자 정의 일정
    startDate: Date;
    endDate: Date;
    recurring?: boolean;
  }[];
}

@Entity('planets')
// 복합 인덱스 - 성능 향상
@Index(['travelId', 'type']) // Travel 내 타입별 조회
@Index(['travelId', 'status']) // Travel 내 상태별 조회
export class Planet extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Planet 이름',
  })
  @IsString()
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Planet 설명',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Planet 아이콘 또는 이미지 URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  /**
   * 타입 및 소속
   */
  @Column({
    type: 'enum',
    enum: PlanetType,
    comment: 'Planet 타입 (단체/1:1)',
  })
  @IsEnum(PlanetType)
  @Index() // 타입별 조회 최적화
  type: PlanetType;

  @Column({ comment: '소속 Travel ID' })
  @Index() // Travel별 조회 최적화
  travelId: number;

  @ManyToOne(() => Travel, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'travelId' })
  travel: Travel;

  /**
   * 상태 관리
   */
  @Column({
    type: 'enum',
    enum: PlanetStatus,
    default: PlanetStatus.ACTIVE,
    comment: 'Planet 상태 (ACTIVE/INACTIVE)',
  })
  @IsEnum(PlanetStatus)
  @Index() // 상태별 필터링
  status: PlanetStatus;

  /**
   * 시간 제한 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '시간 제한 설정 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  timeRestriction?: TimeRestriction;

  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: 'Planet 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: 'Planet 정보 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 관계 설정
   */
  @OneToMany('PlanetUser', 'planet')
  planetUsers: any[];

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 단체 Planet인지 확인
   */
  isGroupPlanet(): boolean {
    return this.type === PlanetType.GROUP;
  }

  /**
   * 1:1 Planet인지 확인
   */
  isDirectPlanet(): boolean {
    return this.type === PlanetType.DIRECT;
  }

  /**
   * 공지사항 Planet인지 확인
   */
  isAnnouncementPlanet(): boolean {
    return this.type === PlanetType.ANNOUNCEMENT;
  }

  /**
   * 현재 시간에 채팅 가능한지 확인
   */
  isChatAllowed(): boolean {
    if (this.status !== PlanetStatus.ACTIVE) {
      return false;
    }

    if (
      !this.timeRestriction ||
      this.timeRestriction.type === TimeRestrictionType.NONE
    ) {
      return true;
    }

    const now = new Date();
    const restriction = this.timeRestriction;

    switch (restriction.type) {
      case TimeRestrictionType.DAILY:
        return this.checkDailyTimeRestriction(now, restriction);

      case TimeRestrictionType.WEEKLY:
        return this.checkWeeklyTimeRestriction(now, restriction);

      case TimeRestrictionType.CUSTOM:
        return this.checkCustomTimeRestriction(now, restriction);

      default:
        return true;
    }
  }

  /**
   * 일일 시간 제한 확인
   */
  private checkDailyTimeRestriction(
    now: Date,
    restriction: TimeRestriction,
  ): boolean {
    if (!restriction.startTime || !restriction.endTime) return true;

    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    return (
      currentTime >= restriction.startTime && currentTime <= restriction.endTime
    );
  }

  /**
   * 주간 시간 제한 확인
   */
  private checkWeeklyTimeRestriction(
    now: Date,
    restriction: TimeRestriction,
  ): boolean {
    if (!restriction.daysOfWeek || restriction.daysOfWeek.length === 0)
      return true;

    const currentDay = now.getDay(); // 0(일) ~ 6(토)
    const isDayAllowed = restriction.daysOfWeek.includes(currentDay);

    if (!isDayAllowed) return false;

    // 허용된 요일이면 시간 제한도 확인
    return this.checkDailyTimeRestriction(now, restriction);
  }

  /**
   * 사용자 정의 시간 제한 확인
   */
  private checkCustomTimeRestriction(
    now: Date,
    restriction: TimeRestriction,
  ): boolean {
    if (!restriction.customSchedule) return true;

    return restriction.customSchedule.some((schedule) => {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      return now >= start && now <= end;
    });
  }

  /**
   * 다음 채팅 가능 시간 계산
   */
  getNextChatTime(): Date | null {
    if (
      !this.timeRestriction ||
      this.timeRestriction.type === TimeRestrictionType.NONE
    ) {
      return null; // 제한 없음
    }

    const now = new Date();
    const restriction = this.timeRestriction;

    switch (restriction.type) {
      case TimeRestrictionType.DAILY:
        return this.getNextDailyChatTime(now, restriction);

      case TimeRestrictionType.WEEKLY:
        return this.getNextWeeklyChatTime(now, restriction);

      case TimeRestrictionType.CUSTOM:
        return this.getNextCustomChatTime(now, restriction);

      default:
        return null;
    }
  }

  /**
   * 다음 일일 채팅 가능 시간 계산
   */
  private getNextDailyChatTime(
    now: Date,
    restriction: TimeRestriction,
  ): Date | null {
    if (!restriction.startTime) return null;

    const [hours, minutes] = restriction.startTime.split(':').map(Number);
    const nextChatTime = new Date(now);
    nextChatTime.setHours(hours, minutes, 0, 0);

    // 오늘의 채팅 시간이 지났으면 내일로
    if (nextChatTime <= now) {
      nextChatTime.setDate(nextChatTime.getDate() + 1);
    }

    return nextChatTime;
  }

  /**
   * 다음 주간 채팅 가능 시간 계산
   */
  private getNextWeeklyChatTime(
    now: Date,
    restriction: TimeRestriction,
  ): Date | null {
    if (
      !restriction.daysOfWeek ||
      restriction.daysOfWeek.length === 0 ||
      !restriction.startTime
    ) {
      return null;
    }

    const [hours, minutes] = restriction.startTime.split(':').map(Number);
    const currentDay = now.getDay();

    // 오늘이 허용 요일인지 확인
    if (restriction.daysOfWeek.includes(currentDay)) {
      const todayChatTime = new Date(now);
      todayChatTime.setHours(hours, minutes, 0, 0);

      if (todayChatTime > now) {
        return todayChatTime; // 오늘 채팅 시간이 남아있음
      }
    }

    // 다음 허용 요일 찾기
    for (let i = 1; i <= 7; i++) {
      const futureDay = (currentDay + i) % 7;
      if (restriction.daysOfWeek.includes(futureDay)) {
        const nextChatTime = new Date(now);
        nextChatTime.setDate(nextChatTime.getDate() + i);
        nextChatTime.setHours(hours, minutes, 0, 0);
        return nextChatTime;
      }
    }

    return null;
  }

  /**
   * 다음 커스텀 채팅 가능 시간 계산
   */
  private getNextCustomChatTime(
    now: Date,
    restriction: TimeRestriction,
  ): Date | null {
    if (!restriction.customSchedule) return null;

    // 현재 시간 이후의 가장 가까운 스케줄 찾기
    let nextTime: Date | null = null;

    for (const schedule of restriction.customSchedule) {
      const start = new Date(schedule.startDate);

      if (start > now) {
        if (!nextTime || start < nextTime) {
          nextTime = start;
        }
      }
    }

    return nextTime;
  }

  /**
   * 시간대를 고려한 현재 시간 조회
   */
  private getCurrentTimeInTimezone(): Date {
    const now = new Date();

    if (!this.timeRestriction?.timezone) {
      return now;
    }

    try {
      // 시간대 변환 (간단한 구현)
      const timezonedDate = new Date(
        now.toLocaleString('en-US', {
          timeZone: this.timeRestriction.timezone,
        }),
      );
      return timezonedDate;
    } catch (error) {
      // 시간대 변환 실패 시 UTC 시간 사용
      return now;
    }
  }

  /**
   * 시간 제한 설정
   */
  setTimeRestriction(restriction: TimeRestriction): void {
    this.timeRestriction = restriction;
  }

  /**
   * 시간 제한 제거
   */
  removeTimeRestriction(): void {
    this.timeRestriction = {
      type: TimeRestrictionType.NONE,
    };
  }

  /**
   * Planet 비활성화
   */
  deactivate(): void {
    this.status = PlanetStatus.INACTIVE;
  }

  /**
   * Planet 활성화
   */
  activate(): void {
    this.status = PlanetStatus.ACTIVE;
  }
}
