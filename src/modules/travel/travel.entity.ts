import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
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
import { User } from '../user/user.entity';

/**
 * Travel 상태
 */
export enum TravelStatus {
  PLANNING = 'planning', // 계획 중
  ACTIVE = 'active', // 활성 (진행 중)
  COMPLETED = 'completed', // 완료
  CANCELLED = 'cancelled', // 취소
  EXPIRED = 'expired', // 만료
}

/**
 * Travel 공개 설정
 */
export enum TravelVisibility {
  PUBLIC = 'public', // 공개 (누구나 가입 가능)
  PRIVATE = 'private', // 비공개 (초대만)
  INVITE_ONLY = 'invite_only', // 초대 전용
}

@Entity('travels')
// 복합 인덱스 - 성능 향상
@Index(['status', 'isActive']) // 활성 상태 + 상태별 조회
@Index(['isActive', 'expiryDate']) // 활성 Travel의 만료일 조회
@Index(['status', 'expiryDate']) // 상태별 만료일 조회
@Index(['visibility', 'isActive']) // 공개 설정별 활성 Travel 조회
@Index(['createdBy', 'status']) // 사용자별 상태 필터링
@Index(['createdBy', 'isActive', 'expiryDate']) // 사용자별 활성 Travel 만료일순
export class Travel extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: '여행 이름',
  })
  @IsString()
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '여행 설명',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '여행 이미지 URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  /**
   * 소유자 및 관리
   */
  @Column({ comment: '여행 생성자 ID' })
  @IsNumber()
  @Index() // 생성자별 조회 최적화
  createdBy: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  /**
   * 상태 관리
   */
  @Column({
    type: 'enum',
    enum: TravelStatus,
    default: TravelStatus.PLANNING,
    comment: '여행 상태',
  })
  @IsEnum(TravelStatus)
  @Index() // 상태별 조회 최적화
  status: TravelStatus;

  @Column({
    type: 'boolean',
    default: true,
    comment: '활성 상태',
  })
  @IsBoolean()
  @Index() // 활성 상태 필터링
  isActive: boolean;

  /**
   * 날짜 관리
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '여행 시작 예정 날짜',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '여행 종료 예정 날짜',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @Column({
    type: 'timestamp',
    comment: '채팅 만료 날짜 (이후 채팅 불가)',
  })
  @IsDateString()
  @Index() // 만료 날짜 정렬 최적화
  expiryDate: Date;

  /**
   * 접근 제어
   */
  @Column({
    type: 'enum',
    enum: TravelVisibility,
    default: TravelVisibility.INVITE_ONLY,
    comment: '공개 설정',
  })
  @IsEnum(TravelVisibility)
  @Index() // 공개 설정별 필터링
  visibility: TravelVisibility;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
    comment: '초대 코드 (공유용)',
  })
  @IsOptional()
  @IsString()
  @Index() // 초대 코드 검색 최적화
  inviteCode?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: '초대 코드 활성화 여부',
  })
  @IsBoolean()
  inviteCodeEnabled: boolean;

  /**
   * 제한 설정
   */
  @Column({
    type: 'int',
    default: TRAVEL_CONSTANTS.DEFAULT_MAX_PLANETS_PER_TRAVEL,
    comment: '최대 Planet 개수',
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  maxPlanets: number;

  @Column({
    type: 'int',
    default: TRAVEL_CONSTANTS.MAX_GROUP_PLANET_MEMBERS,
    comment: '그룹 Planet 최대 멤버 수',
  })
  @IsNumber()
  @Min(2)
  @Max(500)
  maxGroupMembers: number;

  /**
   * 통계 정보
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '현재 멤버 수',
  })
  @IsNumber()
  memberCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '현재 Planet 수',
  })
  @IsNumber()
  planetCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '총 메시지 수',
  })
  @IsNumber()
  totalMessages: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 활동 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 활동 시간 정렬 최적화
  lastActivityAt?: Date;

  /**
   * 설정 (JSON)
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Travel 세부 설정 (JSON)',
  })
  @IsOptional()
  settings?: {
    allowDirectPlanets?: boolean; // 1:1 Planet 생성 허용
    autoCreateGroupPlanet?: boolean; // 자동 그룹 Planet 생성
    requireApproval?: boolean; // 가입 승인 필요
    maxDailyMessages?: number; // 일일 메시지 제한
    allowFileUpload?: boolean; // 파일 업로드 허용
    allowedFileTypes?: string[]; // 허용된 파일 형식
    timezone?: string; // 시간대
    language?: string; // 언어
    customRules?: string; // 사용자 정의 규칙
  };

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
  @CreateDateColumn({ comment: '여행 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: '여행 정보 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 관계 설정
   */
  @OneToMany('TravelUser', 'travel')
  travelUsers: any[];

  @OneToMany('Planet', 'travel')
  planets: any[];

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 만료 상태 확인
   */
  isExpired(): boolean {
    return new Date() > this.expiryDate;
  }

  /**
   * 진행 중 상태 확인
   */
  isOngoing(): boolean {
    const now = new Date();
    return (
      this.isActive && this.status === TravelStatus.ACTIVE && !this.isExpired()
    );
  }

  /**
   * 가입 가능 상태 확인
   */
  canJoin(): boolean {
    return (
      this.isActive &&
      !this.isExpired() &&
      this.status !== TravelStatus.CANCELLED &&
      this.status !== TravelStatus.EXPIRED
    );
  }

  /**
   * 초대 코드 생성
   */
  generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.inviteCode = result;
    return result;
  }

  /**
   * 초대 코드 비활성화
   */
  disableInviteCode(): void {
    this.inviteCodeEnabled = false;
  }

  /**
   * Travel 시작
   */
  start(): void {
    this.status = TravelStatus.ACTIVE;
    if (!this.startDate) {
      this.startDate = new Date();
    }
  }

  /**
   * Travel 완료
   */
  complete(): void {
    this.status = TravelStatus.COMPLETED;
    if (!this.endDate) {
      this.endDate = new Date();
    }
  }

  /**
   * Travel 취소
   */
  cancel(): void {
    this.status = TravelStatus.CANCELLED;
    this.isActive = false;
  }

  /**
   * 멤버 수 증가
   */
  incrementMemberCount(): void {
    this.memberCount += 1;
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
   * Planet 수 증가
   */
  incrementPlanetCount(): void {
    this.planetCount += 1;
  }

  /**
   * Planet 수 감소
   */
  decrementPlanetCount(): void {
    if (this.planetCount > 0) {
      this.planetCount -= 1;
    }
  }

  /**
   * 메시지 수 증가
   */
  incrementMessageCount(): void {
    this.totalMessages += 1;
    this.lastActivityAt = new Date();
  }

  /**
   * 새 Planet 생성 가능 여부
   */
  canCreatePlanet(): boolean {
    return this.planetCount < this.maxPlanets && this.isOngoing();
  }

  /**
   * 진행률 계산 (시작일 ~ 종료일 기준)
   */
  getProgress(): number {
    if (!this.startDate || !this.endDate) return 0;

    const now = Date.now();
    const start = this.startDate.getTime();
    const end = this.endDate.getTime();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }

  /**
   * 만료까지 남은 시간 (분 단위)
   */
  getMinutesUntilExpiry(): number {
    const now = new Date();
    const diffMs = this.expiryDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }

  /**
   * 만료까지 남은 일 수
   */
  getDaysUntilExpiry(): number {
    return Math.ceil(this.getMinutesUntilExpiry() / (60 * 24));
  }

  /**
   * 만료 임박 여부 (지정된 일 수 이내)
   */
  isExpiryWarning(warningDays: number = 7): boolean {
    const daysUntil = this.getDaysUntilExpiry();
    return daysUntil > 0 && daysUntil <= warningDays;
  }

  /**
   * Travel 만료 처리
   * - 상태를 EXPIRED로 변경
   * - 활성 상태 비활성화
   * - lastActivityAt 업데이트
   */
  expire(): void {
    this.status = TravelStatus.EXPIRED;
    this.isActive = false;
    this.lastActivityAt = new Date();
  }

  /**
   * Travel 만료 복구 (관리자용)
   * - 만료 날짜 연장 후 호출
   */
  reactivateFromExpiry(): void {
    if (this.status === TravelStatus.EXPIRED && !this.isExpired()) {
      this.status = TravelStatus.ACTIVE;
      this.isActive = true;
      this.lastActivityAt = new Date();
    }
  }

  /**
   * 만료 상태 정보 반환
   */
  getExpiryStatus(): {
    isExpired: boolean;
    minutesUntilExpiry: number;
    daysUntilExpiry: number;
    isWarning: boolean;
    expiryDate: Date;
  } {
    return {
      isExpired: this.isExpired(),
      minutesUntilExpiry: this.getMinutesUntilExpiry(),
      daysUntilExpiry: this.getDaysUntilExpiry(),
      isWarning: this.isExpiryWarning(),
      expiryDate: this.expiryDate,
    };
  }
}
