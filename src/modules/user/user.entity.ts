import { Exclude } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 소셜 로그인 제공자
 */
export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * 사용자 온라인 상태
 */
export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

@Entity('users')
@Index(['socialId', 'provider'], { unique: true }) // 소셜 ID + 제공자 조합 고유
// 복합 인덱스 - 성능 향상
@Index(['status', 'isOnline']) // 상태별 온라인 사용자 조회
@Index(['provider', 'isOnline']) // 제공자별 온라인 사용자 조회
@Index(['isBanned', 'banExpiresAt']) // 밴된 사용자의 만료일 조회
@Index(['isOnline', 'lastSeenAt']) // 온라인 상태별 최근 접속 시간순
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 소셜 로그인 정보
   */
  @Column({ type: 'varchar', length: 255, comment: '소셜 로그인 고유 ID' })
  @IsString()
  @Index() // 소셜 ID 조회 최적화
  socialId: string;

  @Column({
    type: 'enum',
    enum: SocialProvider,
    comment: '소셜 로그인 제공자 (Google, Apple)',
  })
  @IsEnum(SocialProvider)
  @Index() // 제공자별 조회 최적화
  provider: SocialProvider;

  /**
   * 기본 프로필 정보
   */
  @Column({ type: 'varchar', length: 100, comment: '사용자 이름' })
  @IsString()
  name: string;

  @Column({
    type: 'varchar',
    length: 200,
    unique: true,
    comment: '이메일 주소',
  })
  @IsEmail()
  @Index() // 이메일 검색 최적화
  email: string;

  @Column({ type: 'text', nullable: true, comment: '프로필 이미지 URL' })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '전화번호',
  })
  @IsOptional()
  @IsString()
  @Index() // 전화번호 검색 최적화
  phone?: string;

  /**
   * 온라인 상태 관리
   */
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE,
    comment: '사용자 온라인 상태',
  })
  @IsEnum(UserStatus)
  @Index() // 사용자 상태 필터링
  status: UserStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: '현재 온라인 여부 (실시간)',
  })
  @IsBoolean()
  @Index() // 온라인 상태 필터링 최적화
  isOnline: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 접속 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 마지막 접속 시간 정렬 최적화
  lastSeenAt?: Date;

  /**
   * 추가 설정
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '알림 수신 여부',
  })
  @IsBoolean()
  notificationsEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '광고성 알림 수신 동의 여부',
  })
  @IsBoolean()
  advertisingConsentEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'ko',
    comment: '언어 설정',
  })
  @IsOptional()
  @IsString()
  language: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Asia/Seoul',
    comment: '시간대 설정',
  })
  @IsOptional()
  @IsString()
  timezone: string;

  /**
   * 보안 정보 (소셜 로그인 전용이므로 패스워드 없음)
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Refresh Token',
  })
  @IsOptional()
  @IsString()
  @Exclude()
  refreshToken?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Refresh Token 만료 시간',
  })
  @IsOptional()
  @IsDateString()
  @Exclude()
  refreshTokenExpiresAt?: Date;

  /**
   * 계정 상태
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '계정 활성화 여부',
  })
  @IsBoolean()
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '계정 정지 여부',
  })
  @IsBoolean()
  @Index() // 밤 상태 필터링
  isBanned: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '정지 해제 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 밤 만료 시간 정렬
  banExpiresAt?: Date;

  /**
   * 통계 정보
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '로그인 횟수',
  })
  loginCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '첫 로그인 시간',
  })
  @IsOptional()
  @IsDateString()
  firstLoginAt?: Date;

  /**
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '소셜 로그인 추가 정보 (JSON)',
  })
  @IsOptional()
  socialMetadata?: Record<string, any>;

  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: '계정 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: '정보 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 관계 설정
   */
  @OneToOne('Profile', 'user', {
    eager: false,
    cascade: true, // Profile도 함께 저장/삭제
    onDelete: 'CASCADE',
  })
  profile?: any; // Profile 타입은 순환 참조를 피하기 위해 any 사용

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 온라인 상태 업데이트
   */
  setOnline(status: UserStatus = UserStatus.ONLINE): void {
    this.isOnline = true;
    this.status = status;
    this.lastSeenAt = new Date();
  }

  /**
   * 오프라인 상태 설정
   */
  setOffline(): void {
    this.isOnline = false;
    this.status = UserStatus.OFFLINE;
    this.lastSeenAt = new Date();
  }

  /**
   * 계정 정지
   */
  banUser(duration?: number): void {
    this.isBanned = true;
    if (duration) {
      this.banExpiresAt = new Date(Date.now() + duration);
    }
  }

  /**
   * 계정 정지 해제
   */
  unbanUser(): void {
    this.isBanned = false;
    this.banExpiresAt = undefined;
  }

  /**
   * 정지 상태 확인
   */
  isBannedNow(): boolean {
    if (!this.isBanned) return false;
    if (!this.banExpiresAt) return true;
    return new Date() < this.banExpiresAt;
  }

  /**
   * 로그인 카운트 증가
   */
  incrementLoginCount(): void {
    this.loginCount += 1;
    if (!this.firstLoginAt) {
      this.firstLoginAt = new Date();
    }
  }

  /**
   * 사용자 표시명 (이름 또는 이메일)
   */
  getDisplayName(): string {
    return this.name || this.email.split('@')[0];
  }

  /**
   * 온라인 지속 시간 계산
   */
  getOnlineDuration(): number {
    if (!this.lastSeenAt) return 0;
    return Date.now() - this.lastSeenAt.getTime();
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 사용자 생성 전 기본값 설정
   */
  @BeforeInsert()
  beforeInsert() {
    // 기본 프로필 설정
    if (!this.status) {
      this.status = UserStatus.OFFLINE;
    }

    if (this.isOnline === undefined) {
      this.isOnline = false;
    }

    console.log(`🟢 User creating: ${this.email}`);
  }

  /**
   * 사용자 정보 수정 전 처리
   */
  @BeforeUpdate()
  beforeUpdate() {
    // 온라인 상태 변경 시 lastSeenAt 업데이트
    if (!this.isOnline) {
      this.lastSeenAt = new Date();
    }

    console.log(`🟡 User updating: ${this.email}`);
  }
}
