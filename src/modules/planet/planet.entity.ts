import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
  IsNumber,
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
import { TRAVEL_CONSTANTS } from '../../common/constants/app.constants';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';

/**
 * Planet 타입 (채팅방 유형)
 */
export enum PlanetType {
  GROUP = 'group', // 단체 채팅
  DIRECT = 'direct', // 1:1 채팅
}

/**
 * Planet 상태
 */
export enum PlanetStatus {
  ACTIVE = 'active', // 활성
  INACTIVE = 'inactive', // 비활성
  ARCHIVED = 'archived', // 보관됨
  BLOCKED = 'blocked', // 차단됨
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
@Index(['type']) // 타입별 조회 최적화
@Index(['travelId']) // Travel별 조회 최적화
@Index(['status']) // 상태별 필터링
@Index(['isActive']) // 활성 상태 필터링
@Index(['createdBy']) // 생성자별 조회
@Index(['lastMessageAt']) // 최근 메시지 정렬
@Index(['messageCount']) // 메시지 수 정렬 최적화
@Index(['memberCount']) // 멤버 수 정렬 최적화
// 복합 인덱스 - 성능 향상
@Index(['travelId', 'type']) // Travel 내 타입별 조회
@Index(['travelId', 'isActive']) // Travel 내 활성 Planet 조회
@Index(['travelId', 'status']) // Travel 내 상태별 조회
@Index(['type', 'isActive']) // 타입별 활성 Planet 조회
@Index(['createdBy', 'type']) // 사용자별 타입 필터링
@Index(['isActive', 'lastMessageAt']) // 활성 Planet의 최근 메시지순
@Index(['travelId', 'isActive', 'lastMessageAt']) // Travel 내 활성 Planet 최근 메시지순
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
  @Index()
  type: PlanetType;

  @Column({ comment: '소속 Travel ID' })
  @IsNumber()
  @Index()
  travelId: number;

  @ManyToOne(() => Travel, { eager: false })
  @JoinColumn({ name: 'travelId' })
  travel: Travel;

  @Column({ comment: 'Planet 생성자 ID' })
  @IsNumber()
  createdBy: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  /**
   * 상태 관리
   */
  @Column({
    type: 'enum',
    enum: PlanetStatus,
    default: PlanetStatus.ACTIVE,
    comment: 'Planet 상태',
  })
  @IsEnum(PlanetStatus)
  status: PlanetStatus;

  @Column({
    type: 'boolean',
    default: true,
    comment: '활성 상태',
  })
  @IsBoolean()
  @Index()
  isActive: boolean;

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
   * 멤버 관리
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '현재 멤버 수',
  })
  @IsNumber()
  @Index()
  memberCount: number;

  @Column({
    type: 'int',
    default: TRAVEL_CONSTANTS.MAX_GROUP_PLANET_MEMBERS, // 기본값으로 그룹 Planet 최대값 설정
    comment: '최대 멤버 수',
  })
  @IsNumber()
  maxMembers: number;

  /**
   * 메시지 통계
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '총 메시지 수',
  })
  @IsNumber()
  @Index()
  messageCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 메시지 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index()
  lastMessageAt?: Date;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '마지막 메시지 내용 (미리보기용)',
  })
  @IsOptional()
  @IsString()
  lastMessagePreview?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: '마지막 메시지 보낸 사용자 ID',
  })
  @IsOptional()
  @IsNumber()
  lastMessageUserId?: number;

  /**
   * Planet 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Planet 세부 설정 (JSON)',
  })
  @IsOptional()
  settings?: {
    allowFileUpload?: boolean; // 파일 업로드 허용
    allowedFileTypes?: string[]; // 허용된 파일 형식
    maxFileSize?: number; // 최대 파일 크기
    messageRetentionDays?: number; // 메시지 보관 기간
    readReceiptsEnabled?: boolean; // 읽음 상태 표시
    typingIndicatorsEnabled?: boolean; // 타이핑 상태 표시
    notificationsEnabled?: boolean; // 알림 허용
    muteUntil?: Date; // 음소거 해제 시간
    customSettings?: Record<string, any>; // 사용자 정의 설정
  };

  /**
   * 1:1 채팅 전용 필드
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '1:1 채팅 상대방 ID (DIRECT 타입 전용)',
  })
  @IsOptional()
  @IsNumber()
  @Index()
  partnerId?: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'partnerId' })
  partner?: User;

  /**
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '추가 메타데이터 (JSON)',
  })
  @IsOptional()
  metadata?: Record<string, any>;

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
   * 1:1 Planet 기본 검증
   * 1:1 Planet은 정확히 2명의 멤버만 가질 수 있음
   */
  isValidDirectPlanet(): boolean {
    return (
      this.isDirectPlanet() && this.maxMembers === 2 && this.partnerId != null
    );
  }

  /**
   * 1:1 Planet의 생성자 또는 파트너인지 확인
   */
  isDirectPlanetParticipant(userId: number): boolean {
    if (!this.isDirectPlanet()) {
      return false;
    }
    return this.createdBy === userId || this.partnerId === userId;
  }

  /**
   * 1:1 Planet에서 상대방 ID 조회
   */
  getDirectPlanetPartner(userId: number): number | null {
    if (!this.isDirectPlanet()) {
      return null;
    }

    if (this.createdBy === userId) {
      return this.partnerId || null;
    } else if (this.partnerId === userId) {
      return this.createdBy;
    }

    return null;
  }

  /**
   * 현재 시간에 채팅 가능한지 확인
   */
  isChatAllowed(): boolean {
    if (!this.isActive || this.status !== PlanetStatus.ACTIVE) {
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
   * 새 멤버 가입 가능 여부
   */
  canAddMember(): boolean {
    return this.memberCount < this.maxMembers && this.isActive;
  }

  /**
   * 멤버 수 증가
   */
  incrementMemberCount(): void {
    if (this.canAddMember()) {
      this.memberCount += 1;
    }
  }

  /**
   * 멤버 수 감소
   */
  decrementMemberCount(): void {
    if (this.memberCount > 0) {
      this.memberCount -= 1;
    }
  }

  /**
   * 메시지 수 증가 및 마지막 메시지 정보 업데이트
   */
  updateLastMessage(content: string, userId: number): void {
    this.messageCount += 1;
    this.lastMessageAt = new Date();
    this.lastMessagePreview =
      content.length > 200 ? content.substring(0, 200) + '...' : content;
    this.lastMessageUserId = userId;
  }

  /**
   * Planet 비활성화
   */
  deactivate(): void {
    this.isActive = false;
    this.status = PlanetStatus.INACTIVE;
  }

  /**
   * Planet 활성화
   */
  activate(): void {
    this.isActive = true;
    this.status = PlanetStatus.ACTIVE;
  }

  /**
   * Planet 보관
   */
  archive(): void {
    this.isActive = false;
    this.status = PlanetStatus.ARCHIVED;
  }

  /**
   * Planet 차단
   */
  block(): void {
    this.isActive = false;
    this.status = PlanetStatus.BLOCKED;
  }
}
