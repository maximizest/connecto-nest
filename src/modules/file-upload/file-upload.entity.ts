import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

/**
 * 파일 업로드 상태
 */
export enum FileUploadStatus {
  PENDING = 'pending', // 업로드 대기
  UPLOADING = 'uploading', // 업로드 중
  PROCESSING = 'processing', // 후처리 중 (썸네일 생성 등)
  COMPLETED = 'completed', // 완료
  FAILED = 'failed', // 실패
  CANCELLED = 'cancelled', // 취소됨
}

/**
 * 업로드 타입
 */
export enum FileUploadType {
  DIRECT = 'direct', // Direct Upload (Presigned URL)
  SINGLE = 'single', // 단일 파일 업로드 (레거시)
  MULTIPART = 'multipart', // 멀티파트 업로드 (레거시)
}

/**
 * 파일 업로드 추적 엔티티
 */
@Entity('file_uploads')
// 복합 인덱스 - 성능 향상
@Index(['userId', 'status']) // 사용자별 상태 조회 최적화
@Index(['status', 'createdAt']) // 상태별 시간순 조회
export class FileUpload extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 업로드한 사용자
   */
  @Column({ comment: '업로드한 사용자 ID', nullable: true })
  @IsOptional()
  @IsNumber()
  @Index() // 사용자별 업로드 조회
  userId?: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /**
   * 하드 삭제 익명화 필드
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '탈퇴한 사용자의 파일 여부',
  })
  @IsBoolean()
  @Index() // 탈퇴한 사용자 파일 필터링
  isFromDeletedUser: boolean;

  /**
   * 파일 기본 정보
   */
  @Column({ type: 'varchar', length: 255, comment: '원본 파일명' })
  @IsString()
  @MaxLength(255)
  originalFileName: string;

  @Column({ type: 'varchar', length: 500, comment: '스토리지 키 (경로)' })
  @IsString()
  @MaxLength(500)
  @Index() // 스토리지 키별 조회
  storageKey: string;

  @Column({ type: 'varchar', length: 100, comment: '파일 MIME 타입' })
  @IsString()
  @MaxLength(100)
  mimeType: string;

  @Column({ type: 'bigint', comment: '파일 크기 (bytes)' })
  @IsNumber()
  fileSize: number;

  /**
   * 업로드 정보
   */
  @Column({
    type: 'enum',
    enum: FileUploadType,
    comment: '업로드 타입',
  })
  @IsEnum(FileUploadType)
  @Index() // 업로드 타입별 조회
  uploadType: FileUploadType;

  @Column({
    type: 'enum',
    enum: FileUploadStatus,
    default: FileUploadStatus.PENDING,
    comment: '업로드 상태',
  })
  @IsEnum(FileUploadStatus)
  @Index() // 상태별 조회
  status: FileUploadStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '업로드 ID (레거시 멀티파트용)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  uploadId?: string;

  /**
   * 진행률 정보
   */
  @Column({ type: 'int', default: 0, comment: '전체 청크 수 (레거시)' })
  @IsNumber()
  totalChunks: number;

  @Column({ type: 'int', default: 0, comment: '완료된 청크 수 (레거시)' })
  @IsNumber()
  completedChunks: number;

  @Column({
    type: 'bigint',
    default: 0,
    comment: '업로드된 바이트 수 (레거시)',
  })
  @IsNumber()
  uploadedBytes: number;

  @Column({ type: 'int', default: 0, comment: '진행률 (0-100)' })
  @IsNumber()
  progress: number;

  /**
   * 추가 정보
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '업로드 폴더',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  folder?: string;

  @Column({ type: 'text', nullable: true, comment: '파일 공개 URL' })
  @IsString()
  @IsOptional()
  publicUrl?: string;

  @Column({ type: 'json', nullable: true, comment: '추가 메타데이터' })
  @IsJSON()
  @IsOptional()
  metadata?: Record<string, any>;

  /**
   * 에러 정보
   */
  @Column({ type: 'text', nullable: true, comment: '실패 사유' })
  @IsString()
  @IsOptional()
  errorMessage?: string;

  @Column({ type: 'int', default: 0, comment: '재시도 횟수' })
  @IsNumber()
  retryCount: number;

  /**
   * 시간 정보
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '업로드 시작 시간',
  })
  @IsDateString()
  @IsOptional()
  startedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '업로드 완료 시간',
  })
  @IsDateString()
  @IsOptional()
  completedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 청크 업로드 시간',
  })
  @IsDateString()
  @IsOptional()
  lastChunkUploadedAt?: Date;

  @CreateDateColumn({ comment: '생성 시간' })
  @IsDateString()
  @Index() // 시간별 정렬
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 업로드 시작
   */
  startUpload(): void {
    this.status = FileUploadStatus.UPLOADING;
    this.startedAt = new Date();
  }

  /**
   * 청크 업로드 완료
   */
  completeChunk(chunkSize: number): void {
    this.completedChunks += 1;
    this.uploadedBytes += chunkSize;
    this.lastChunkUploadedAt = new Date();

    // 진행률 계산
    if (this.totalChunks > 0) {
      this.progress = Math.round(
        (this.completedChunks / this.totalChunks) * 100,
      );
    } else {
      this.progress = Math.round((this.uploadedBytes / this.fileSize) * 100);
    }
  }

  /**
   * 업로드 완료
   */
  completeUpload(publicUrl?: string): void {
    this.status = FileUploadStatus.COMPLETED;
    this.progress = 100;
    this.completedAt = new Date();
    if (publicUrl) {
      this.publicUrl = publicUrl;
    }
  }

  /**
   * 업로드 실패
   */
  failUpload(errorMessage: string): void {
    this.status = FileUploadStatus.FAILED;
    this.errorMessage = errorMessage;
    this.retryCount += 1;
  }

  /**
   * 업로드 취소
   */
  cancelUpload(): void {
    this.status = FileUploadStatus.CANCELLED;
  }

  /**
   * 업로드 소요 시간 계산 (초)
   */
  getUploadDuration(): number | null {
    if (!this.startedAt) return null;

    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * 평균 업로드 속도 계산 (bytes/sec)
   */
  getAverageSpeed(): number | null {
    const duration = this.getUploadDuration();
    if (!duration || duration === 0) return null;

    return Math.floor(this.uploadedBytes / duration);
  }

  /**
   * 예상 남은 시간 계산 (초)
   */
  getEstimatedTimeRemaining(): number | null {
    const avgSpeed = this.getAverageSpeed();
    if (!avgSpeed || this.status !== FileUploadStatus.UPLOADING) return null;

    const remainingBytes = this.fileSize - this.uploadedBytes;
    return Math.ceil(remainingBytes / avgSpeed);
  }

  /**
   * 업로드 상태 확인 메서드들
   */
  isCompleted(): boolean {
    return this.status === FileUploadStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === FileUploadStatus.FAILED;
  }

  isInProgress(): boolean {
    return this.status === FileUploadStatus.UPLOADING;
  }

  isCancelled(): boolean {
    return this.status === FileUploadStatus.CANCELLED;
  }

  canRetry(): boolean {
    return this.status === FileUploadStatus.FAILED && this.retryCount < 3;
  }

  /**
   * 업로드 요약 정보
   */
  getSummary() {
    return {
      id: this.id,
      fileName: this.originalFileName,
      fileSize: this.fileSize,
      status: this.status,
      progress: this.progress,
      uploadType: this.uploadType,
      duration: this.getUploadDuration(),
      averageSpeed: this.getAverageSpeed(),
      estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    };
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 파일 업로드 레코드 생성 전 기본값 설정
   * - 기본 상태 및 진행률 설정
   * - 초기 카운터 값 설정
   */
  @BeforeInsert()
  beforeInsert() {
    // 기본값 설정
    this.status = this.status || FileUploadStatus.PENDING;
    this.totalChunks = this.totalChunks || 0;
    this.completedChunks = this.completedChunks || 0;
    this.uploadedBytes = this.uploadedBytes || 0;
    this.progress = this.progress || 0;
    this.retryCount = this.retryCount || 0;

    // Log creation for debugging
  }

  /**
   * 파일 업로드 레코드 수정 전 처리
   * - 진행률 재계산
   */
  @BeforeUpdate()
  beforeUpdate() {
    // 진행률 재계산 (청크 업로드의 경우)
    if (this.completedChunks !== undefined && this.totalChunks > 0) {
      this.progress = Math.round(
        (this.completedChunks / this.totalChunks) * 100,
      );
    }

    // Log update for debugging
  }

  /**
   * 업로드 사용자 표시 이름 반환 (탈퇴한 사용자 처리)
   */
  getUploaderDisplayName(fallbackName?: string): string {
    if (this.isFromDeletedUser) {
      return '탈퇴한 사용자';
    }

    return this.user?.name || fallbackName || '알 수 없음';
  }

  /**
   * 탈퇴한 사용자의 파일인지 확인
   */
  isFromDeletedUserAccount(): boolean {
    return this.isFromDeletedUser;
  }
}
