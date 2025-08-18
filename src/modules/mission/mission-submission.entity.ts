import { IsEnum, IsOptional, IsObject } from 'class-validator';
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
import { Mission } from './mission.entity';
import { MissionType } from './enums/mission-type.enum';
import { SubmissionStatus } from './enums/submission-status.enum';
import { Exclude } from 'class-transformer';

@Entity('mission_submissions')
@Index(['userId', 'missionId']) // 사용자별 미션 제출 조회
@Index(['travelId', 'missionId']) // 여행별 미션 제출 조회
@Index(['status']) // 상태별 조회 최적화
@Index(['submittedAt']) // 제출 시간별 정렬
export class MissionSubmission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 ID
   */
  @Column({
    type: 'int',
    comment: '미션 ID',
  })
  missionId: number;

  @Column({
    type: 'int',
    comment: '제출한 사용자 ID',
  })
  userId: number;

  @Column({
    type: 'int',
    comment: '여행 ID',
  })
  travelId: number;

  /**
   * 제출 정보
   */
  @Column({
    type: 'enum',
    enum: MissionType,
    comment: '제출 타입',
  })
  @IsEnum(MissionType)
  submissionType: MissionType;

  /**
   * 제출 내용
   * - 이미지/비디오: { fileUrl, thumbnailUrl?, caption? }
   * - 밸런스 게임: { answers: [{ questionId, answer: 'A'|'B' }] }
   */
  @Column({
    type: 'jsonb',
    comment: '제출 데이터',
  })
  @IsObject()
  content: Record<string, any>;

  /**
   * 상태 관리
   */
  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
    comment: '제출 상태',
  })
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  /**
   * 평가 정보
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '평가한 관리자/호스트 ID',
  })
  @IsOptional()
  reviewedBy?: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '평가 시간',
  })
  @IsOptional()
  reviewedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '평가 코멘트',
  })
  @IsOptional()
  reviewComment?: string;

  /**
   * 메시지 연동
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '연결된 메시지 ID (채팅방에 전송된 메시지)',
  })
  @IsOptional()
  messageId?: number;

  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: '제출 시간' })
  submittedAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @Exclude()
  updatedAt: Date;

  /**
   * 관계 설정
   */
  @ManyToOne(() => Mission, (mission) => mission.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionId' })
  mission: Mission;

  @ManyToOne('User', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne('Travel', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'travelId' })
  travel: any;

  @ManyToOne('User', {
    nullable: true,
  })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: any;

  @ManyToOne('Message', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'messageId' })
  message?: any;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 제출 완료 처리
   */
  complete(): void {
    this.status = SubmissionStatus.COMPLETED;
  }

  /**
   * 제출 거절 처리
   */
  reject(reviewerId: number, comment?: string): void {
    this.status = SubmissionStatus.REJECTED;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (comment) {
      this.reviewComment = comment;
    }
  }

  /**
   * 제출 승인 처리
   */
  approve(reviewerId: number, comment?: string): void {
    this.status = SubmissionStatus.COMPLETED;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (comment) {
      this.reviewComment = comment;
    }
  }

  /**
   * 펜딩 상태 확인
   */
  isPending(): boolean {
    return this.status === SubmissionStatus.PENDING;
  }

  /**
   * 완료 상태 확인
   */
  isCompleted(): boolean {
    return this.status === SubmissionStatus.COMPLETED;
  }

  /**
   * 거절 상태 확인
   */
  isRejected(): boolean {
    return this.status === SubmissionStatus.REJECTED;
  }

  /**
   * 밸런스 게임 답변 검증
   */
  validateBalanceGameAnswers(questions: any[]): boolean {
    if (this.submissionType !== MissionType.BALANCE_GAME) return true;

    const answers = this.content.answers;
    if (!Array.isArray(answers)) return false;

    // 모든 질문에 대한 답변이 있는지 확인
    const questionIds = questions.map((q) => q.id);
    const answeredQuestionIds = answers.map((a) => a.questionId);

    return (
      questionIds.length === answeredQuestionIds.length &&
      questionIds.every((id) => answeredQuestionIds.includes(id)) &&
      answers.every((a) => ['A', 'B'].includes(a.answer))
    );
  }

  /**
   * 미디어 제출 검증
   */
  validateMediaSubmission(): boolean {
    if (
      this.submissionType !== MissionType.IMAGE &&
      this.submissionType !== MissionType.VIDEO
    ) {
      return true;
    }

    return !!this.content.fileUrl && typeof this.content.fileUrl === 'string';
  }
}
