import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 보안 이벤트 타입
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FILE_SCAN_THREAT = 'file_scan_threat',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  MALWARE_DETECTED = 'malware_detected',
  SPAM_DETECTED = 'spam_detected',
  IP_BLOCKED = 'ip_blocked',
  SESSION_HIJACK = 'session_hijack',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
}

/**
 * 보안 위험도 수준
 */
export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 보안 이벤트 상태
 */
export enum SecurityEventStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  IGNORED = 'ignored',
}

/**
 * 보안 이벤트 로그 엔티티
 *
 * 모든 보안 관련 이벤트와 위협을 기록하고 추적합니다.
 */
@Entity('security_events')
@Index(['type', 'createdAt'])
@Index(['riskLevel', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['status', 'createdAt'])
export class SecurityEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: SecurityEventType,
    comment: '보안 이벤트 타입',
  })
  type: SecurityEventType;

  @Column({
    type: 'enum',
    enum: SecurityRiskLevel,
    comment: '위험도 수준',
  })
  riskLevel: SecurityRiskLevel;

  @Column({
    type: 'enum',
    enum: SecurityEventStatus,
    default: SecurityEventStatus.DETECTED,
    comment: '이벤트 상태',
  })
  status: SecurityEventStatus;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '이벤트 제목',
  })
  title: string;

  @Column({
    type: 'text',
    comment: '이벤트 설명',
  })
  description: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '관련 사용자 ID',
  })
  userId?: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP 주소',
  })
  ipAddress?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User Agent',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '요청 URL',
  })
  requestUrl?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'HTTP 메서드',
  })
  requestMethod?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '리소스 타입 (travel, planet, message, file)',
  })
  resourceType?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '리소스 ID',
  })
  resourceId?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '파일명 (파일 관련 이벤트)',
  })
  fileName?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '파일 타입',
  })
  fileType?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '파일 크기 (바이트)',
  })
  fileSize?: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '추가 메타데이터',
  })
  metadata?: {
    headers?: any;
    payload?: any;
    scanResults?: any;
    geoLocation?: {
      country?: string;
      region?: string;
      city?: string;
    };
    [key: string]: any;
  };

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '탐지 규칙/소스',
  })
  detectionSource?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '해결 시간',
  })
  resolvedAt?: Date;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '해결한 관리자 ID',
  })
  resolvedBy?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '해결 방법/노트',
  })
  resolutionNotes?: string;

  @CreateDateColumn({
    comment: '이벤트 발생 시간',
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: '이벤트 정보 수정 시간',
  })
  updatedAt: Date;

  /**
   * 이벤트가 중요한지 판단
   */
  isCritical(): boolean {
    return this.riskLevel === SecurityRiskLevel.CRITICAL;
  }

  /**
   * 이벤트가 해결되었는지 확인
   */
  isResolved(): boolean {
    return this.status === SecurityEventStatus.RESOLVED;
  }

  /**
   * 이벤트 해결 처리
   */
  resolve(resolvedBy: number, notes?: string): void {
    this.status = SecurityEventStatus.RESOLVED;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
  }

  /**
   * 파일 관련 이벤트인지 확인
   */
  isFileRelated(): boolean {
    return [
      SecurityEventType.FILE_SCAN_THREAT,
      SecurityEventType.MALWARE_DETECTED,
    ].includes(this.type);
  }

  /**
   * 브루트포스 공격 관련 이벤트인지 확인
   */
  isBruteForceRelated(): boolean {
    return [
      SecurityEventType.BRUTE_FORCE_ATTACK,
      SecurityEventType.LOGIN_FAILURE,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
    ].includes(this.type);
  }
}

/**
 * IP 차단 목록 엔티티
 */
@Entity('blocked_ips')
@Index(['ipAddress', 'isActive'])
@Index(['blockedUntil'])
export class BlockedIp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 45,
    unique: true,
    comment: 'IP 주소',
  })
  ipAddress: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '차단 사유',
  })
  reason: string;

  @Column({
    type: 'enum',
    enum: SecurityRiskLevel,
    comment: '위험도 수준',
  })
  riskLevel: SecurityRiskLevel;

  @Column({
    type: 'boolean',
    default: true,
    comment: '차단 활성 상태',
  })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '차단 해제 시간 (null이면 영구)',
  })
  blockedUntil?: Date;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '차단한 관리자 ID',
  })
  blockedBy?: number;

  @Column({
    type: 'bigint',
    default: 1,
    comment: '차단 횟수',
  })
  blockCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 위반 시간',
  })
  lastViolationAt?: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '추가 메타데이터',
  })
  metadata?: {
    geoLocation?: any;
    userAgents?: string[];
    violationTypes?: string[];
    associatedUsers?: number[];
    [key: string]: any;
  };

  @CreateDateColumn({
    comment: '최초 차단 시간',
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: '차단 정보 수정 시간',
  })
  updatedAt: Date;

  /**
   * 차단이 만료되었는지 확인
   */
  isExpired(): boolean {
    if (!this.blockedUntil) return false; // 영구 차단
    return new Date() > this.blockedUntil;
  }

  /**
   * 차단을 해제
   */
  unblock(): void {
    this.isActive = false;
    this.blockedUntil = new Date();
  }

  /**
   * 차단 기간 연장
   */
  extendBlock(hours: number): void {
    const now = new Date();
    const extensionTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    if (!this.blockedUntil || this.blockedUntil < extensionTime) {
      this.blockedUntil = extensionTime;
    }

    this.blockCount += 1;
    this.lastViolationAt = now;
    this.isActive = true;
  }
}

/**
 * 파일 스캔 결과 엔티티
 */
@Entity('file_scan_results')
@Index(['fileHash'])
@Index(['scanStatus', 'createdAt'])
@Index(['threatLevel', 'createdAt'])
export class FileScanResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 64,
    comment: '파일 해시 (SHA-256)',
  })
  fileHash: string;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '파일명',
  })
  fileName: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '파일 MIME 타입',
  })
  mimeType: string;

  @Column({
    type: 'bigint',
    comment: '파일 크기 (바이트)',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: '스캔 상태 (pending, scanning, completed, failed)',
  })
  scanStatus: 'pending' | 'scanning' | 'completed' | 'failed';

  @Column({
    type: 'enum',
    enum: SecurityRiskLevel,
    nullable: true,
    comment: '위협 수준',
  })
  threatLevel?: SecurityRiskLevel;

  @Column({
    type: 'boolean',
    default: false,
    comment: '악성 코드 탐지 여부',
  })
  isMalicious: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '스팸 탐지 여부',
  })
  isSpam: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '스캔 엔진 결과',
  })
  scanResults?: {
    engines?: {
      name: string;
      result: string;
      threat?: string;
    }[];
    detectedThreats?: string[];
    confidence?: number;
    scanTime?: number;
    error?: string;
  };

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '업로드한 사용자 ID',
  })
  uploadedBy?: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: '업로드 IP 주소',
  })
  uploadIp?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '스토리지 키',
  })
  storageKey?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '스캔 시작 시간',
  })
  scanStartedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '스캔 완료 시간',
  })
  scanCompletedAt?: Date;

  @CreateDateColumn({
    comment: '스캔 요청 시간',
  })
  createdAt: Date;

  @UpdateDateColumn({
    comment: '스캔 결과 수정 시간',
  })
  updatedAt: Date;

  /**
   * 스캔 완료 여부 확인
   */
  isScanned(): boolean {
    return this.scanStatus === 'completed';
  }

  /**
   * 파일이 안전한지 확인
   */
  isSafe(): boolean {
    return this.isScanned() && !this.isMalicious && !this.isSpam;
  }

  /**
   * 스캔 시작 처리
   */
  startScan(): void {
    this.scanStatus = 'scanning';
    this.scanStartedAt = new Date();
  }

  /**
   * 스캔 완료 처리
   */
  completeScan(results: any): void {
    this.scanStatus = 'completed';
    this.scanCompletedAt = new Date();
    this.scanResults = results;

    // 결과 분석
    if (results.detectedThreats && results.detectedThreats.length > 0) {
      this.isMalicious = true;
      this.threatLevel = SecurityRiskLevel.HIGH;
    }
  }

  /**
   * 스캔 실패 처리
   */
  failScan(error: string): void {
    this.scanStatus = 'failed';
    this.scanResults = { error };
  }
}
