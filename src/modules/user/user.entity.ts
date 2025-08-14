import { Exclude } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
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


@Entity('users')
@Index(['socialId', 'provider'], { unique: true }) // 소셜 ID + 제공자 조합 고유
// 복합 인덱스 - 성능 향상
@Index(['isBanned']) // 밴된 사용자 조회
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

  /**
   * 계정 상태
   */

  @Column({
    type: 'boolean',
    default: false,
    comment: '계정 정지 여부 (로그인 불가)',
  })
  @IsBoolean()
  @Index() // 벤 상태 필터링
  isBanned: boolean;

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
   * 계정 정지 (로그인 불가)
   */
  banUser(): void {
    this.isBanned = true;
  }

  /**
   * 계정 정지 해제
   */
  unbanUser(): void {
    this.isBanned = false;
  }

  /**
   * 정지 상태 확인 (로그인 불가)
   */
  isBannedNow(): boolean {
    return this.isBanned;
  }

  /**
   * 사용자 표시명 (이름 또는 이메일)
   */
  getDisplayName(): string {
    return this.name || this.email.split('@')[0];
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 사용자 생성 전 기본값 설정
   */
  @BeforeInsert()
  beforeInsert() {
    console.log(`🟢 User creating: ${this.email}`);
  }

  /**
   * 사용자 정보 수정 전 처리
   */
  @BeforeUpdate()
  beforeUpdate() {
    console.log(`🟡 User updating: ${this.email}`);
  }
}
