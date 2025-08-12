import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';

/**
 * Travel 내 사용자 역할
 */
export enum TravelUserRole {
  MEMBER = 'member', // 일반 멤버
  ADMIN = 'admin', // 관리자
  OWNER = 'owner', // 소유자
}

/**
 * 가입 상태
 */
export enum TravelUserStatus {
  PENDING = 'pending', // 승인 대기
  ACTIVE = 'active', // 활성 (참여 중)
  LEFT = 'left', // 탈퇴
  BANNED = 'banned', // 정지
  INVITED = 'invited', // 초대됨 (응답 대기)
}

@Entity('travel_users')
@Unique(['travelId', 'userId']) // Travel당 사용자는 하나의 레코드만
// 복합 인덱스 - 성능 향상
@Index(['travelId', 'status']) // Travel 내 활성 멤버 조회
@Index(['travelId', 'role']) // Travel 내 역할별 조회
@Index(['userId', 'status']) // 사용자별 활성 Travel 조회
@Index(['status', 'joinedAt']) // 상태별 가입순 정렬
@Index(['travelId', 'status', 'role']) // Travel 내 상태별 역할 조회
@Index(['userId', 'joinedAt']) // 사용자별 가입순 Travel
@Index(['invitedBy', 'status']) // 초대자별 상태 조회
export class TravelUser extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: 'Travel ID' })
  @IsNumber()
  @Index() // Travel별 멤버 조회 최적화
  travelId: number;

  @ManyToOne(() => Travel, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'travelId' })
  travel: Travel;

  @Column({ comment: '사용자 ID', nullable: true })
  @IsOptional()
  @IsNumber()
  @Index() // 사용자별 Travel 조회 최적화
  userId?: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /**
   * 하드 삭제 익명화 필드
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '탈퇴한 사용자의 기록 여부',
  })
  @IsBoolean()
  @Index() // 탈퇴한 사용자 필터링
  isDeletedUser: boolean;

  /**
   * 역할 및 권한
   */
  @Column({
    type: 'enum',
    enum: TravelUserRole,
    default: TravelUserRole.MEMBER,
    comment: 'Travel 내 역할',
  })
  @IsEnum(TravelUserRole)
  @Index() // 역할별 필터링
  role: TravelUserRole;

  @Column({
    type: 'enum',
    enum: TravelUserStatus,
    default: TravelUserStatus.ACTIVE,
    comment: '참여 상태',
  })
  @IsEnum(TravelUserStatus)
  @Index() // 상태별 필터링
  status: TravelUserStatus;

  /**
   * 가입 및 활동 정보
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '가입 날짜',
  })
  @IsDateString()
  @Index() // 가입 순서 정렬
  joinedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 접속 시간',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 마지막 접속 시간 정렬
  lastSeenAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '탈퇴 날짜',
  })
  @IsOptional()
  @IsDateString()
  @Index() // 탈퇴 시간 정렬
  leftAt?: Date;

  /**
   * 초대 정보
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '초대한 사용자 ID',
  })
  @IsOptional()
  @IsNumber()
  @Index() // 초대자별 조회
  invitedBy?: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'invitedBy' })
  inviter?: User;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '초대 날짜',
  })
  @IsOptional()
  @IsDateString()
  invitedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '초대 응답 날짜',
  })
  @IsOptional()
  @IsDateString()
  respondedAt?: Date;

  /**
   * 정지 및 제재 정보
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '정지 여부',
  })
  @IsBoolean()
  isBanned: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '정지 시작 시간',
  })
  @IsOptional()
  @IsDateString()
  bannedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '정지 해제 시간',
  })
  @IsOptional()
  @IsDateString()
  banExpiresAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: '정지 처리한 관리자 ID',
  })
  @IsOptional()
  @IsNumber()
  bannedBy?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '정지 사유',
  })
  @IsOptional()
  banReason?: string;

  /**
   * 권한 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '개별 권한 설정 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  permissions?: {
    canCreatePlanet?: boolean; // Planet 생성 권한
    canInviteMembers?: boolean; // 멤버 초대 권한
    canManageMembers?: boolean; // 멤버 관리 권한
    canDeleteMessages?: boolean; // 메시지 삭제 권한
    canUploadFiles?: boolean; // 파일 업로드 권한
    canCreateDirectPlanet?: boolean; // 1:1 Planet 생성 권한
    canAccessAllPlanets?: boolean; // 모든 Planet 접근 권한
    maxDailyMessages?: number; // 일일 메시지 제한
    customPermissions?: string[]; // 사용자 정의 권한
  };

  /**
   * 사용자 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '사용자별 설정 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  settings?: {
    notificationsEnabled?: boolean; // 알림 활성화
    soundEnabled?: boolean; // 소리 알림
    muteUntil?: Date; // 음소거 해제 시간
    autoJoinNewPlanets?: boolean; // 새 Planet 자동 참여
    language?: string; // 언어 설정
    timezone?: string; // 시간대 설정
    theme?: 'light' | 'dark'; // 테마 설정
    customSettings?: Record<string, any>; // 사용자 정의 설정
  };

  /**
   * 통계 정보
   */
  @Column({
    type: 'int',
    default: 0,
    comment: '전송한 메시지 수',
  })
  @IsNumber()
  messageCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '생성한 Planet 수',
  })
  @IsNumber()
  createdPlanetCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '초대한 멤버 수',
  })
  @IsNumber()
  inviteCount: number;

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
  @CreateDateColumn({ comment: '레코드 생성 시간' })
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn({ comment: '레코드 수정 시간' })
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 소유자인지 확인
   */
  isOwner(): boolean {
    return this.role === TravelUserRole.OWNER;
  }

  /**
   * 관리자인지 확인 (소유자 포함)
   */
  isAdmin(): boolean {
    return (
      this.role === TravelUserRole.ADMIN || this.role === TravelUserRole.OWNER
    );
  }

  /**
   * 활성 멤버인지 확인
   */
  isActiveMember(): boolean {
    return this.status === TravelUserStatus.ACTIVE && !this.isBannedNow();
  }

  /**
   * 현재 정지 상태인지 확인
   */
  isBannedNow(): boolean {
    if (!this.isBanned) return false;
    if (!this.banExpiresAt) return true;
    return new Date() < this.banExpiresAt;
  }

  /**
   * 초대 대기 상태인지 확인
   */
  isPendingInvite(): boolean {
    return this.status === TravelUserStatus.INVITED;
  }

  /**
   * 승인 대기 상태인지 확인
   */
  isPendingApproval(): boolean {
    return this.status === TravelUserStatus.PENDING;
  }

  /**
   * 사용자 정지
   */
  banUser(bannedBy: number, reason?: string, duration?: number): void {
    this.isBanned = true;
    this.bannedAt = new Date();
    this.bannedBy = bannedBy;
    this.banReason = reason;
    this.status = TravelUserStatus.BANNED;

    if (duration) {
      this.banExpiresAt = new Date(Date.now() + duration);
    }
  }

  /**
   * 사용자 정지 해제
   */
  unbanUser(): void {
    this.isBanned = false;
    this.bannedAt = undefined;
    this.banExpiresAt = undefined;
    this.bannedBy = undefined;
    this.banReason = undefined;
    this.status = TravelUserStatus.ACTIVE;
  }

  /**
   * 역할 변경
   */
  changeRole(newRole: TravelUserRole): void {
    this.role = newRole;
  }

  /**
   * 소유자로 승격
   */
  promoteToOwner(): void {
    this.role = TravelUserRole.OWNER;
  }

  /**
   * 관리자로 승격
   */
  promoteToAdmin(): void {
    this.role = TravelUserRole.ADMIN;
  }

  /**
   * 일반 멤버로 강등
   */
  demoteToMember(): void {
    this.role = TravelUserRole.MEMBER;
  }

  /**
   * 초대 응답
   */
  respondToInvite(accept: boolean): void {
    this.respondedAt = new Date();

    if (accept) {
      this.status = TravelUserStatus.ACTIVE;
      this.joinedAt = new Date();
    } else {
      this.status = TravelUserStatus.LEFT;
    }
  }

  /**
   * Travel 탈퇴
   */
  leave(): void {
    this.status = TravelUserStatus.LEFT;
    this.leftAt = new Date();
  }

  /**
   * 마지막 접속 시간 업데이트
   */
  updateLastSeen(): void {
    this.lastSeenAt = new Date();
  }

  /**
   * 메시지 수 증가
   */
  incrementMessageCount(): void {
    this.messageCount += 1;
  }

  /**
   * 생성한 Planet 수 증가
   */
  incrementCreatedPlanetCount(): void {
    this.createdPlanetCount += 1;
  }

  /**
   * 초대 수 증가
   */
  incrementInviteCount(): void {
    this.inviteCount += 1;
  }

  /**
   * 특정 권한 확인
   */
  hasPermission(permission: string): boolean {
    // 소유자는 모든 권한 보유
    if (this.isOwner()) return true;

    // 관리자는 대부분 권한 보유 (예외 있을 수 있음)
    if (this.isAdmin()) {
      switch (permission) {
        case 'canCreatePlanet':
        case 'canInviteMembers':
        case 'canManageMembers':
        case 'canDeleteMessages':
        case 'canUploadFiles':
        case 'canCreateDirectPlanet':
        case 'canAccessAllPlanets':
          return true;
        default:
          return this.permissions?.[permission] === true;
      }
    }

    // 일반 멤버는 개별 권한 설정 확인
    return this.permissions?.[permission] === true;
  }

  /**
   * 권한 부여
   */
  grantPermission(permission: string): void {
    if (!this.permissions) {
      this.permissions = {};
    }
    this.permissions[permission] = true;
  }

  /**
   * 권한 제거
   */
  revokePermission(permission: string): void {
    if (this.permissions) {
      this.permissions[permission] = false;
    }
  }

  /**
   * 가입 기간 계산 (일 단위)
   */
  getMembershipDays(): number {
    const diffTime = Date.now() - this.joinedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 정지 남은 시간 계산 (초 단위)
   */
  getBanRemainingSeconds(): number {
    if (!this.isBanned || !this.banExpiresAt) return 0;

    const remaining = this.banExpiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * 참여율 계산 (메시지 수 기준)
   */
  getParticipationScore(totalMessages: number): number {
    if (totalMessages === 0) return 0;
    return Math.round((this.messageCount / totalMessages) * 100);
  }

  /**
   * 사용자 표시 이름 반환 (탈퇴한 사용자 처리)
   */
  getUserDisplayName(fallbackName?: string): string {
    if (this.isDeletedUser) {
      return '탈퇴한 사용자';
    }

    return this.user?.name || fallbackName || '알 수 없음';
  }

  /**
   * 사용자 아바터 URL 반환 (탈퇴한 사용자 처리)
   */
  getUserAvatarUrl(): string | null {
    if (this.isDeletedUser) {
      return null; // 기본 아바터 사용
    }

    return this.user?.avatar || null;
  }

  /**
   * 탈퇴한 사용자의 기록인지 확인
   */
  isFromDeletedUserAccount(): boolean {
    return this.isDeletedUser;
  }
}
