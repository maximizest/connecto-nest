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
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';

/**
 * Planet 내 사용자 역할 (주로 1:1 Planet용)
 */
export enum PlanetUserRole {
  PARTICIPANT = 'participant', // 참여자 (1:1의 경우)
  CREATOR = 'creator', // 생성자
  ADMIN = 'admin', // 관리자 (그룹 Planet에서 사용)
}

/**
 * Planet 참여 상태
 */
export enum PlanetUserStatus {
  ACTIVE = 'active', // 활성 참여
  LEFT = 'left', // 탈퇴
  BANNED = 'banned', // 정지
  INVITED = 'invited', // 초대됨 (1:1 Planet 전용)
  MUTED = 'muted', // 음소거됨
}

@Entity('planet_users')
@Unique(['planetId', 'userId']) // Planet당 사용자는 하나의 레코드만
// 복합 인덱스 - 성능 향상
@Index(['planetId', 'status']) // Planet 내 활성 멤버 조회
export class PlanetUser extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: 'Planet ID' })
  @IsNumber()
  @Index() // Planet별 멤버 조회 최적화
  planetId: number;

  @ManyToOne(() => Planet, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  @Column({ comment: '사용자 ID' })
  @IsNumber()
  @Index() // 사용자별 Planet 조회 최적화
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 역할 및 상태
   */
  @Column({
    type: 'enum',
    enum: PlanetUserRole,
    default: PlanetUserRole.PARTICIPANT,
    comment: 'Planet 내 역할',
  })
  @IsEnum(PlanetUserRole)
  @Index() // 역할별 필터링
  role: PlanetUserRole;

  @Column({
    type: 'enum',
    enum: PlanetUserStatus,
    default: PlanetUserStatus.ACTIVE,
    comment: '참여 상태',
  })
  @IsEnum(PlanetUserStatus)
  @Index() // 상태별 필터링
  status: PlanetUserStatus;

  /**
   * 참여 및 활동 정보
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '참여 날짜',
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
  lastSeenAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '탈퇴 날짜',
  })
  @IsOptional()
  @IsDateString()
  leftAt?: Date;

  /**
   * 초대 정보 (1:1 Planet 전용)
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '초대한 사용자 ID',
  })
  @IsOptional()
  @IsNumber()
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
   * 읽음 상태 관리
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '마지막 읽은 메시지 ID',
  })
  @IsOptional()
  @IsNumber()
  @Index() // 읽음 상태 조회 최적화
  lastReadMessageId?: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 읽음 시간',
  })
  @IsOptional()
  @IsDateString()
  lastReadAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: '읽지 않은 메시지 수',
  })
  @IsNumber()
  unreadCount: number;

  /**
   * 알림 및 설정
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '알림 활성화 여부',
  })
  @IsBoolean()
  notificationsEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '음소거 상태',
  })
  @IsBoolean()
  isMuted: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '음소거 해제 시간',
  })
  @IsOptional()
  @IsDateString()
  muteUntil?: Date;

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
   * Planet 내 개별 권한 (그룹 Planet용)
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Planet 내 개별 권한 설정 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  permissions?: {
    canSendMessages?: boolean; // 메시지 전송 권한
    canUploadFiles?: boolean; // 파일 업로드 권한
    canDeleteMessages?: boolean; // 메시지 삭제 권한 (자신의 메시지)
    canInviteMembers?: boolean; // 멤버 초대 권한 (그룹 Planet)
    canManageMembers?: boolean; // 멤버 관리 권한
    canEditPlanetInfo?: boolean; // Planet 정보 수정 권한
    maxDailyMessages?: number; // 일일 메시지 제한
    customPermissions?: string[]; // 사용자 정의 권한
  };

  /**
   * 개인화 설정
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Planet별 개인 설정 (JSON)',
  })
  @IsOptional()
  @IsJSON()
  personalSettings?: {
    nickname?: string; // Planet 내 별명
    customStatus?: string; // 사용자 정의 상태 메시지
    theme?: 'light' | 'dark'; // 테마 설정
    fontSize?: 'small' | 'medium' | 'large'; // 폰트 크기
    soundEnabled?: boolean; // 소리 알림
    vibrationEnabled?: boolean; // 진동 알림
    showReadReceipts?: boolean; // 읽음 상태 표시
    showTypingIndicators?: boolean; // 타이핑 상태 표시
    autoDownloadImages?: boolean; // 이미지 자동 다운로드
    autoDownloadVideos?: boolean; // 비디오 자동 다운로드
  };

  /**
   * 통계 정보
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Planet에서 전송한 메시지 수',
  })
  @IsNumber()
  messageCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '업로드한 파일 수',
  })
  @IsNumber()
  fileCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '첫 메시지 전송 시간',
  })
  @IsOptional()
  @IsDateString()
  firstMessageAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 메시지 전송 시간',
  })
  @IsOptional()
  @IsDateString()
  lastMessageAt?: Date;

  /**
   * 메타데이터
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '추가 메타데이터 (JSON)',
  })
  @IsOptional()
  metadata?: {
    joinMethod?: 'invite' | 'auto' | 'manual'; // 참여 방법
    inviteAcceptedAt?: Date; // 초대 수락 시간
    connectionQuality?: 'good' | 'poor'; // 연결 품질
    clientInfo?: {
      // 클라이언트 정보
      platform?: string;
      version?: string;
      device?: string;
    };
    preferences?: Record<string, any>; // 개인 선호도
  };

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
   * 생성자인지 확인
   */
  isCreator(): boolean {
    return this.role === PlanetUserRole.CREATOR;
  }

  /**
   * 관리자인지 확인 (생성자 포함)
   */
  isAdmin(): boolean {
    return (
      this.role === PlanetUserRole.ADMIN || this.role === PlanetUserRole.CREATOR
    );
  }

  /**
   * 활성 참여자인지 확인
   */
  isActiveParticipant(): boolean {
    return (
      this.status === PlanetUserStatus.ACTIVE &&
      !this.isBannedNow() &&
      !this.isMutedNow()
    );
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
   * 현재 음소거 상태인지 확인
   */
  isMutedNow(): boolean {
    if (!this.isMuted) return false;
    if (!this.muteUntil) return true;
    return new Date() < this.muteUntil;
  }

  /**
   * 초대 대기 상태인지 확인
   */
  isPendingInvite(): boolean {
    return this.status === PlanetUserStatus.INVITED;
  }

  /**
   * 메시지 전송 권한 확인
   */
  canSendMessages(): boolean {
    if (!this.isActiveParticipant()) return false;
    return this.permissions?.canSendMessages !== false;
  }

  /**
   * 파일 업로드 권한 확인
   */
  canUploadFiles(): boolean {
    if (!this.canSendMessages()) return false;
    return this.permissions?.canUploadFiles !== false;
  }

  /**
   * 초대 응답 (1:1 Planet 전용)
   */
  respondToInvite(accept: boolean): void {
    this.respondedAt = new Date();

    if (accept) {
      this.status = PlanetUserStatus.ACTIVE;
      this.joinedAt = new Date();
    } else {
      this.status = PlanetUserStatus.LEFT;
    }
  }

  /**
   * Planet 탈퇴
   */
  leave(): void {
    this.status = PlanetUserStatus.LEFT;
    this.leftAt = new Date();
  }

  /**
   * 사용자 정지
   */
  banUser(bannedBy: number, reason?: string, duration?: number): void {
    this.isBanned = true;
    this.bannedAt = new Date();
    this.bannedBy = bannedBy;
    this.banReason = reason;
    this.status = PlanetUserStatus.BANNED;

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
    this.status = PlanetUserStatus.ACTIVE;
  }

  /**
   * 음소거 설정
   */
  mute(duration?: number): void {
    this.isMuted = true;

    if (duration) {
      this.muteUntil = new Date(Date.now() + duration);
    }
  }

  /**
   * 음소거 해제
   */
  unmute(): void {
    this.isMuted = false;
    this.muteUntil = undefined;
  }

  /**
   * 읽음 상태 업데이트
   */
  markAsRead(messageId: number): void {
    this.lastReadMessageId = messageId;
    this.lastReadAt = new Date();
    this.unreadCount = 0;
  }

  /**
   * 읽지 않은 메시지 수 증가
   */
  incrementUnreadCount(): void {
    this.unreadCount += 1;
  }

  /**
   * 메시지 수 증가
   */
  incrementMessageCount(): void {
    this.messageCount += 1;

    if (!this.firstMessageAt) {
      this.firstMessageAt = new Date();
    }

    this.lastMessageAt = new Date();
  }

  /**
   * 파일 수 증가
   */
  incrementFileCount(): void {
    this.fileCount += 1;
  }

  /**
   * 마지막 접속 시간 업데이트
   */
  updateLastSeen(): void {
    this.lastSeenAt = new Date();
  }

  /**
   * 역할 변경
   */
  changeRole(newRole: PlanetUserRole): void {
    this.role = newRole;
  }

  /**
   * 알림 설정 토글
   */
  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
  }

  /**
   * 특정 권한 확인
   */
  hasPermission(permission: string): boolean {
    // 생성자는 모든 권한 보유
    if (this.isCreator()) return true;

    // 관리자는 대부분 권한 보유
    if (this.isAdmin()) {
      switch (permission) {
        case 'canSendMessages':
        case 'canUploadFiles':
        case 'canDeleteMessages':
        case 'canInviteMembers':
        case 'canManageMembers':
        case 'canEditPlanetInfo':
          return true;
        default:
          return this.permissions?.[permission] === true;
      }
    }

    // 일반 참여자는 개별 권한 확인
    return this.permissions?.[permission] !== false;
  }

  /**
   * 참여 기간 계산 (일 단위)
   */
  getParticipationDays(): number {
    if (this.status === PlanetUserStatus.LEFT && this.leftAt) {
      const diffTime = this.leftAt.getTime() - this.joinedAt.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const diffTime = Date.now() - this.joinedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 활동 점수 계산 (메시지 기준)
   */
  getActivityScore(): number {
    const days = this.getParticipationDays();
    if (days === 0) return 0;

    return Math.round((this.messageCount / days) * 10) / 10; // 일평균 메시지 수
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
   * 음소거 남은 시간 계산 (초 단위)
   */
  getMuteRemainingSeconds(): number {
    if (!this.isMuted || !this.muteUntil) return 0;

    const remaining = this.muteUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  /**
   * Planet 별명 반환 (설정된 경우)
   */
  getDisplayName(fallbackName: string): string {
    return this.personalSettings?.nickname || fallbackName;
  }

  /**
   * 마지막 활동으로부터 경과 시간 (분 단위)
   */
  getMinutesSinceLastActivity(): number {
    const lastActivity = this.lastSeenAt || this.lastMessageAt || this.joinedAt;
    const diffTime = Date.now() - lastActivity.getTime();
    return Math.floor(diffTime / (1000 * 60));
  }

  /**
   * 1:1 Planet 관련 권한 체크 메서드들
   */

  /**
   * 초대 대기 중인지 확인 (1:1 Planet 전용)
   */
  isInvitedToDirectPlanet(): boolean {
    return this.status === PlanetUserStatus.INVITED;
  }

  /**
   * 1:1 Planet에서 채팅할 수 있는 권한이 있는지 확인
   * - 활성 상태여야 함
   * - 정지되지 않았어야 함
   * - 탈퇴하지 않았어야 함
   */
  canChatInDirectPlanet(): boolean {
    return this.status === PlanetUserStatus.ACTIVE && !this.isBannedNow();
  }

  /**
   * 1:1 Planet 초대를 수락할 수 있는지 확인
   */
  canAcceptDirectPlanetInvite(): boolean {
    return this.isInvitedToDirectPlanet() && !this.isBannedNow();
  }

  /**
   * 1:1 Planet에서 메시지 읽기 권한이 있는지 확인
   * 초대받은 상태에서도 읽을 수 있음
   */
  hasDirectPlanetReadPermission(): boolean {
    return this.canChatInDirectPlanet() || this.isInvitedToDirectPlanet();
  }

  /**
   * 1:1 Planet에서 메시지 쓰기 권한이 있는지 확인
   * 반드시 활성 상태여야 함
   */
  hasDirectPlanetWritePermission(): boolean {
    return this.canChatInDirectPlanet();
  }

  /**
   * 1:1 Planet에서 파일 업로드 권한이 있는지 확인
   */
  hasDirectPlanetFileUploadPermission(): boolean {
    return (
      this.canChatInDirectPlanet() && this.permissions?.canUploadFiles !== false
    );
  }

  /**
   * 1:1 Planet 탈퇴 처리
   */
  leaveDirectPlanet(): void {
    this.status = PlanetUserStatus.LEFT;
    this.leftAt = new Date();
    this.lastSeenAt = new Date();
  }

  /**
   * 1:1 Planet 초대 수락 처리
   */
  acceptDirectPlanetInvite(): void {
    if (this.canAcceptDirectPlanetInvite()) {
      this.status = PlanetUserStatus.ACTIVE;
      this.respondedAt = new Date();
      this.joinedAt = new Date();
      this.lastSeenAt = new Date();
    }
  }

  /**
   * 1:1 Planet 초대 거절 처리
   */
  rejectDirectPlanetInvite(): void {
    this.status = PlanetUserStatus.LEFT;
    this.respondedAt = new Date();
    this.leftAt = new Date();
  }
}
