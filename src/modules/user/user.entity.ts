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
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SocialProvider } from './enums/social-provider.enum';
import { UserRole } from './enums/user-role.enum';

@Entity('users')
@Index(['socialId', 'provider'], {
  unique: true,
  where: '"socialId" IS NOT NULL AND "provider" IS NOT NULL', // 소셜 로그인 사용자만
}) // 소셜 ID + 제공자 조합 고유
// 복합 인덱스 - 성능 향상
@Index(['isBanned']) // 밴된 사용자 조회
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 소셜 로그인 정보 (일반 사용자용)
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '소셜 로그인 고유 ID (ADMIN은 null)',
  })
  @IsOptional()
  @IsString()
  @Index() // 소셜 ID 조회 최적화
  socialId?: string;

  @Column({
    type: 'enum',
    enum: SocialProvider,
    nullable: true,
    comment: '소셜 로그인 제공자 (ADMIN은 null)',
  })
  @IsOptional()
  @IsEnum(SocialProvider)
  @Index() // 제공자별 조회 최적화
  provider?: SocialProvider;

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
   * 사용자 역할
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    comment: '사용자 역할 (ADMIN/HOST/USER)',
  })
  @IsEnum(UserRole)
  @Index() // 역할별 조회 최적화
  role: UserRole;

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

  /**
   * 보안 정보
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '비밀번호 (bcrypt 해시, ADMIN 전용)',
  })
  @IsOptional()
  @IsString()
  @Exclude()
  password?: string;

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
   * Soft Delete 지원
   */
  @DeleteDateColumn({ comment: '계정 삭제 시간 (Soft Delete)' })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: '삭제한 사용자 ID',
  })
  @IsOptional()
  deletedBy?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '삭제 사유',
  })
  @IsOptional()
  @IsString()
  deletionReason?: string;

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

  /**
   * 관리자 권한 확인
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * 호스트 권한 확인 (여행 생성 가능)
   */
  isHost(): boolean {
    return this.role === UserRole.HOST || this.role === UserRole.ADMIN;
  }

  /**
   * 역할 업그레이드
   */
  upgradeToHost(): void {
    if (this.role === UserRole.USER) {
      this.role = UserRole.HOST;
    }
  }

  /**
   * 관리자 권한 부여
   */
  makeAdmin(): void {
    this.role = UserRole.ADMIN;
  }

  /**
   * 이메일/비밀번호 로그인 가능 여부 확인
   */
  canLoginWithPassword(): boolean {
    return this.role === UserRole.ADMIN && !!this.password;
  }

  /**
   * 소셜 로그인 사용자인지 확인
   */
  isSocialUser(): boolean {
    return !!this.socialId && !!this.provider;
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 사용자 생성 전 기본값 설정 및 유효성 검사
   */
  @BeforeInsert()
  beforeInsert() {
    // ADMIN은 비밀번호 필수, 소셜 로그인 정보 없어야 함
    if (this.role === UserRole.ADMIN) {
      if (!this.password) {
        throw new Error('ADMIN 계정은 비밀번호가 필수입니다.');
      }
      if (this.socialId || this.provider) {
        throw new Error('ADMIN 계정은 소셜 로그인을 사용할 수 없습니다.');
      }
    }
    // 일반 사용자는 소셜 로그인 정보 필수
    else {
      if (!this.socialId || !this.provider) {
        throw new Error('일반 사용자는 소셜 로그인 정보가 필수입니다.');
      }
      if (this.password) {
        throw new Error('일반 사용자는 비밀번호를 설정할 수 없습니다.');
      }
    }
  }

  /**
   * 사용자 정보 수정 전 처리 및 유효성 검사
   */
  @BeforeUpdate()
  beforeUpdate() {
    // 역할 변경 시 유효성 검사
    if (this.role === UserRole.ADMIN) {
      if (!this.password && !this.socialId) {
        throw new Error('ADMIN 계정은 비밀번호가 필수입니다.');
      }
    }
  }
}
