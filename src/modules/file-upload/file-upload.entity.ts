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
  COMPLETED = 'completed', // 완료
  FAILED = 'failed', // 실패
}

/**
 * 업로드 타입
 */
export enum FileUploadType {
  DIRECT = 'direct', // Direct Upload (Presigned URL)
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

  @Column({ type: 'text', nullable: true, comment: '썸네일 URL (이미지/비디오)' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    nullable: true, 
    comment: 'Cloudflare Media ID (Stream UID 또는 Images ID)' 
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  cloudflareMediaId?: string;

  @Column({ 
    type: 'enum',
    enum: ['r2', 'stream', 'images'],
    default: 'r2',
    comment: '미디어 저장 위치' 
  })
  @IsString()
  mediaStorage: 'r2' | 'stream' | 'images';

  @Column({ type: 'json', nullable: true, comment: '미디어 변형 URLs (이미지 variants, 비디오 스트리밍 URLs)' })
  @IsJSON()
  @IsOptional()
  mediaVariants?: {
    // Cloudflare Images variants
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    // Cloudflare Stream URLs
    hls?: string;
    dash?: string;
    // 추가 썸네일들
    additionalThumbnails?: string[];
  };

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
    this.status = FileUploadStatus.PENDING;
    this.startedAt = new Date();
  }

  /**
   * 업로드 완료
   */
  completeUpload(publicUrl?: string): void {
    this.status = FileUploadStatus.COMPLETED;
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
   * 업로드 상태 확인 메서드들
   */
  isCompleted(): boolean {
    return this.status === FileUploadStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === FileUploadStatus.FAILED;
  }

  canRetry(): boolean {
    return this.status === FileUploadStatus.FAILED;
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
      uploadType: this.uploadType,
      duration: this.getUploadDuration(),
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

    // Log creation for debugging
  }

  /**
   * 파일 업로드 레코드 수정 전 처리
   */
  @BeforeUpdate()
  beforeUpdate() {
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
