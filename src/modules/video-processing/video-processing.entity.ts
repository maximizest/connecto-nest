import {
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
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileUpload } from '../file-upload/file-upload.entity';
import { User } from '../user/user.entity';

/**
 * 비디오 프로세싱 상태
 */
export enum VideoProcessingStatus {
  PENDING = 'pending', // 대기중
  PROCESSING = 'processing', // 처리중
  COMPLETED = 'completed', // 완료
  FAILED = 'failed', // 실패
  CANCELLED = 'cancelled', // 취소됨
}

/**
 * 프로세싱 타입
 */
export enum VideoProcessingType {
  COMPRESSION = 'compression', // 압축
  THUMBNAIL = 'thumbnail', // 썸네일 추출
  METADATA = 'metadata', // 메타데이터 추출
  PREVIEW = 'preview', // 미리보기 생성
  FULL_PROCESSING = 'full_processing', // 전체 프로세싱
}

/**
 * 품질 프로필
 */
export enum VideoQualityProfile {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * 비디오 프로세싱 작업 엔티티
 */
@Entity('video_processing')
@Index(['userId']) // 사용자별 작업 조회
@Index(['status']) // 상태별 조회
@Index(['processingType']) // 타입별 조회
@Index(['createdAt']) // 시간별 정렬
@Index(['userId', 'status']) // 사용자별 상태 조회 최적화
@Index(['status', 'createdAt']) // 상태별 시간순 조회
export class VideoProcessing extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 연관 관계
   */
  @Column({ comment: '요청한 사용자 ID' })
  @IsNumber()
  @Index()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, comment: '원본 파일 업로드 ID' })
  @IsNumber()
  @IsOptional()
  fileUploadId?: number;

  @ManyToOne(() => FileUpload, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'file_upload_id' })
  fileUpload?: FileUpload;

  /**
   * 프로세싱 정보
   */
  @Column({
    type: 'enum',
    enum: VideoProcessingType,
    comment: '프로세싱 타입',
  })
  @IsEnum(VideoProcessingType)
  @Index()
  processingType: VideoProcessingType;

  @Column({
    type: 'enum',
    enum: VideoProcessingStatus,
    default: VideoProcessingStatus.PENDING,
    comment: '프로세싱 상태',
  })
  @IsEnum(VideoProcessingStatus)
  @Index()
  status: VideoProcessingStatus;

  @Column({
    type: 'enum',
    enum: VideoQualityProfile,
    nullable: true,
    comment: '품질 프로필',
  })
  @IsEnum(VideoQualityProfile)
  @IsOptional()
  qualityProfile?: VideoQualityProfile;

  /**
   * 입력 파일 정보
   */
  @Column({ type: 'varchar', length: 500, comment: '원본 파일 스토리지 키' })
  @IsString()
  @MaxLength(500)
  inputStorageKey: string;

  @Column({ type: 'varchar', length: 255, comment: '원본 파일명' })
  @IsString()
  @MaxLength(255)
  originalFileName: string;

  @Column({ type: 'bigint', comment: '원본 파일 크기 (bytes)' })
  @IsNumber()
  inputFileSize: number;

  @Column({ type: 'varchar', length: 100, comment: '원본 MIME 타입' })
  @IsString()
  @MaxLength(100)
  inputMimeType: string;

  /**
   * 출력 파일 정보
   */
  @Column({ type: 'text', nullable: true, comment: '처리된 파일 키들 (JSON)' })
  @IsString()
  @IsOptional()
  outputStorageKeys?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '출력 파일들 총 크기 (bytes)',
  })
  @IsNumber()
  @IsOptional()
  outputTotalSize?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '출력 파일 공개 URLs (JSON)',
  })
  @IsString()
  @IsOptional()
  outputUrls?: string;

  /**
   * 진행률 및 성능 정보
   */
  @Column({ type: 'int', default: 0, comment: '진행률 (0-100)' })
  @IsNumber()
  progress: number;

  @Column({ type: 'int', nullable: true, comment: '예상 소요 시간 (초)' })
  @IsNumber()
  @IsOptional()
  estimatedDurationSeconds?: number;

  @Column({ type: 'int', nullable: true, comment: '실제 소요 시간 (초)' })
  @IsNumber()
  @IsOptional()
  actualDurationSeconds?: number;

  /**
   * 비디오/오디오 메타데이터
   */
  @Column({ type: 'json', nullable: true, comment: '입력 파일 메타데이터' })
  @IsJSON()
  @IsOptional()
  inputMetadata?: {
    duration: number; // 초
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    codec: string;
    audioChannels?: number;
    audioSampleRate?: number;
    audioCodec?: string;
  };

  @Column({ type: 'json', nullable: true, comment: '출력 파일 메타데이터' })
  @IsJSON()
  @IsOptional()
  outputMetadata?: {
    [quality: string]: {
      duration: number;
      width: number;
      height: number;
      fps: number;
      bitrate: number;
      fileSize: number;
      storageKey: string;
      publicUrl: string;
    };
  };

  /**
   * 썸네일 정보
   */
  @Column({ type: 'json', nullable: true, comment: '썸네일 정보' })
  @IsJSON()
  @IsOptional()
  thumbnails?: {
    timestamp: number; // 초
    storageKey: string;
    publicUrl: string;
    width: number;
    height: number;
    fileSize: number;
  }[];

  /**
   * 에러 및 로그 정보
   */
  @Column({ type: 'text', nullable: true, comment: '에러 메시지' })
  @IsString()
  @IsOptional()
  errorMessage?: string;

  @Column({ type: 'json', nullable: true, comment: 'FFmpeg 로그' })
  @IsJSON()
  @IsOptional()
  processingLogs?: {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }[];

  @Column({ type: 'int', default: 0, comment: '재시도 횟수' })
  @IsNumber()
  retryCount: number;

  /**
   * 시간 정보
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '프로세싱 시작 시간',
  })
  @IsDateString()
  @IsOptional()
  startedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '프로세싱 완료 시간',
  })
  @IsDateString()
  @IsOptional()
  completedAt?: Date;

  @CreateDateColumn({ comment: '생성 시간' })
  @IsDateString()
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @IsDateString()
  updatedAt: Date;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 프로세싱 시작
   */
  startProcessing(): void {
    this.status = VideoProcessingStatus.PROCESSING;
    this.startedAt = new Date();
    this.progress = 0;
  }

  /**
   * 진행률 업데이트
   */
  updateProgress(progress: number, logMessage?: string): void {
    this.progress = Math.max(0, Math.min(100, progress));

    if (logMessage) {
      if (!this.processingLogs) {
        this.processingLogs = [];
      }

      this.processingLogs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: logMessage,
      });
    }
  }

  /**
   * 프로세싱 완료
   */
  completeProcessing(outputs: {
    storageKeys: string[];
    totalSize: number;
    urls: string[];
    metadata?: any;
    thumbnails?: any[];
  }): void {
    this.status = VideoProcessingStatus.COMPLETED;
    this.completedAt = new Date();
    this.progress = 100;

    // 출력 정보 저장
    this.outputStorageKeys = JSON.stringify(outputs.storageKeys);
    this.outputTotalSize = outputs.totalSize;
    this.outputUrls = JSON.stringify(outputs.urls);

    if (outputs.metadata) {
      this.outputMetadata = outputs.metadata;
    }

    if (outputs.thumbnails) {
      this.thumbnails = outputs.thumbnails;
    }

    // 실제 소요 시간 계산
    if (this.startedAt) {
      this.actualDurationSeconds = Math.floor(
        (this.completedAt.getTime() - this.startedAt.getTime()) / 1000,
      );
    }
  }

  /**
   * 프로세싱 실패
   */
  failProcessing(errorMessage: string, errorLogs?: string[]): void {
    this.status = VideoProcessingStatus.FAILED;
    this.errorMessage = errorMessage;
    this.retryCount += 1;

    if (errorLogs) {
      if (!this.processingLogs) {
        this.processingLogs = [];
      }

      errorLogs.forEach((log) => {
        this.processingLogs!.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: log,
        });
      });
    }
  }

  /**
   * 프로세싱 취소
   */
  cancelProcessing(): void {
    this.status = VideoProcessingStatus.CANCELLED;
  }

  /**
   * 프로세싱 소요 시간 계산 (초)
   */
  getProcessingDuration(): number | null {
    if (!this.startedAt) return null;

    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * 압축률 계산 (%)
   */
  getCompressionRatio(): number | null {
    if (!this.outputTotalSize || this.inputFileSize === 0) return null;

    return Math.round((1 - this.outputTotalSize / this.inputFileSize) * 100);
  }

  /**
   * 예상 vs 실제 시간 비교
   */
  getTimeAccuracy(): number | null {
    if (!this.estimatedDurationSeconds || !this.actualDurationSeconds)
      return null;

    const accuracy =
      Math.abs(this.estimatedDurationSeconds - this.actualDurationSeconds) /
      this.estimatedDurationSeconds;

    return Math.round((1 - accuracy) * 100);
  }

  /**
   * 상태 확인 메서드들
   */
  isCompleted(): boolean {
    return this.status === VideoProcessingStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === VideoProcessingStatus.FAILED;
  }

  isProcessing(): boolean {
    return this.status === VideoProcessingStatus.PROCESSING;
  }

  isCancelled(): boolean {
    return this.status === VideoProcessingStatus.CANCELLED;
  }

  canRetry(): boolean {
    return this.status === VideoProcessingStatus.FAILED && this.retryCount < 3;
  }

  /**
   * 프로세싱 요약 정보
   */
  getSummary() {
    return {
      id: this.id,
      processingType: this.processingType,
      status: this.status,
      progress: this.progress,
      qualityProfile: this.qualityProfile,
      originalFileName: this.originalFileName,
      inputFileSize: this.inputFileSize,
      outputTotalSize: this.outputTotalSize,
      compressionRatio: this.getCompressionRatio(),
      processingDuration: this.getProcessingDuration(),
      estimatedDuration: this.estimatedDurationSeconds,
      timeAccuracy: this.getTimeAccuracy(),
      thumbnailCount: this.thumbnails?.length || 0,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      retryCount: this.retryCount,
      canRetry: this.canRetry(),
    };
  }

  /**
   * 썸네일 URL 목록 반환
   */
  getThumbnailUrls(): string[] {
    if (!this.thumbnails) return [];
    return this.thumbnails.map((thumb) => thumb.publicUrl);
  }

  /**
   * 출력 파일 URLs 파싱
   */
  getOutputUrls(): string[] {
    if (!this.outputUrls) return [];

    try {
      return JSON.parse(this.outputUrls);
    } catch (error) {
      return [];
    }
  }

  /**
   * 출력 파일 키 목록 파싱
   */
  getOutputStorageKeys(): string[] {
    if (!this.outputStorageKeys) return [];

    try {
      return JSON.parse(this.outputStorageKeys);
    } catch (error) {
      return [];
    }
  }
}
