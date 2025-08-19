import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { User } from '../user/user.entity';
import { Travel } from '../travel/travel.entity';
import { Planet } from '../planet/planet.entity';
import { Message } from '../message/message.entity';

export enum ReportType {
  SPAM = 'SPAM', // 스팸
  HARASSMENT = 'HARASSMENT', // 괴롭힘/따돌림
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT', // 부적절한 콘텐츠
  VIOLENCE = 'VIOLENCE', // 폭력적인 내용
  HATE_SPEECH = 'HATE_SPEECH', // 혐오 발언
  FRAUD = 'FRAUD', // 사기/사칭
  PRIVACY_VIOLATION = 'PRIVACY_VIOLATION', // 개인정보 침해
  OTHER = 'OTHER', // 기타
}

export enum ReportStatus {
  PENDING = 'PENDING', // 검토 대기
  REVIEWING = 'REVIEWING', // 검토 중
  RESOLVED = 'RESOLVED', // 처리 완료
  REJECTED = 'REJECTED', // 반려
}

export enum ReportContext {
  TRAVEL = 'TRAVEL', // Travel 내에서 발생
  PLANET = 'PLANET', // Planet 내에서 발생
  MESSAGE = 'MESSAGE', // 특정 메시지 신고
  USER_PROFILE = 'USER_PROFILE', // 사용자 프로필 신고
}

/**
 * Report 엔티티
 *
 * 사용자 신고 내역을 관리합니다.
 */
@Entity('reports')
@Index(['reporterId', 'status'])
@Index(['reportedUserId', 'status'])
@Index(['status', 'createdAt'])
@Index(['travelId', 'status'])
@Index(['planetId', 'status'])
export class Report extends BaseActiveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  // ==================== 신고자 정보 ====================

  @Column()
  reporterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  // ==================== 피신고자 정보 ====================

  @Column()
  reportedUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedUserId' })
  reportedUser: User;

  // ==================== 신고 내용 ====================

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.OTHER,
  })
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportContext,
  })
  context: ReportContext;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  // ==================== 컨텍스트 정보 ====================

  @Column({ nullable: true })
  travelId: number | null;

  @ManyToOne(() => Travel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'travelId' })
  travel: Travel | null;

  @Column({ nullable: true })
  planetId: number | null;

  @ManyToOne(() => Planet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'planetId' })
  planet: Planet | null;

  @Column({ nullable: true })
  messageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'messageId' })
  message: Message | null;

  // ==================== 처리 정보 ====================

  @Column({ nullable: true })
  @Exclude()
  reviewedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedBy' })
  @Exclude()
  reviewer: User | null;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  adminNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  // ==================== 추가 정보 ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'text', array: true, default: [] })
  evidenceUrls: string[];

  // ==================== 타임스탬프 ====================

  // ==================== 메서드 ====================

  /**
   * 신고 검토 시작
   */
  startReview(reviewerId: number): void {
    this.status = ReportStatus.REVIEWING;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
  }

  /**
   * 신고 처리 완료
   */
  resolve(reviewerId: number, notes?: string): void {
    this.status = ReportStatus.RESOLVED;
    this.reviewedBy = reviewerId;
    this.adminNotes = notes || null;
    this.resolvedAt = new Date();
  }

  /**
   * 신고 반려
   */
  reject(reviewerId: number, notes?: string): void {
    this.status = ReportStatus.REJECTED;
    this.reviewedBy = reviewerId;
    this.adminNotes = notes || null;
    this.resolvedAt = new Date();
  }

  /**
   * 중복 신고 확인
   */
  static isDuplicate(
    existingReports: Report[],
    reporterId: number,
    reportedUserId: number,
    context: ReportContext,
    contextId?: number,
  ): boolean {
    return existingReports.some((report) => {
      // 동일한 신고자가 동일한 대상을 같은 컨텍스트에서 신고한 경우
      if (
        report.reporterId === reporterId &&
        report.reportedUserId === reportedUserId &&
        report.context === context &&
        report.status === ReportStatus.PENDING
      ) {
        // 컨텍스트별 중복 체크
        switch (context) {
          case ReportContext.TRAVEL:
            return report.travelId === contextId;
          case ReportContext.PLANET:
            return report.planetId === contextId;
          case ReportContext.MESSAGE:
            return report.messageId === contextId;
          case ReportContext.USER_PROFILE:
            return true; // 프로필 신고는 한 번만
          default:
            return false;
        }
      }
      return false;
    });
  }
}
