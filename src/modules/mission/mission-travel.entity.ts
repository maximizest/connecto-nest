import { IsOptional, IsDateString } from 'class-validator';
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
} from 'typeorm';
import { Mission } from './mission.entity';
import { Exclude } from 'class-transformer';

@Entity('mission_travels')
@Unique(['missionId', 'travelId']) // 중복 할당 방지
@Index(['travelId']) // 여행별 미션 조회 최적화
@Index(['missionId']) // 미션별 여행 조회 최적화
export class MissionTravel extends BaseEntity {
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
    comment: '여행 ID',
  })
  travelId: number;

  /**
   * 미션 전송 대상 Planet
   * - 개인 미션: 1:1 채팅방 ID
   * - 단체 미션: 그룹 채팅방 ID
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '미션이 전송될 행성(채팅방) ID',
  })
  @IsOptional()
  planetId?: number;

  /**
   * 미션 할당 정보
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '미션을 할당한 관리자/호스트 ID',
  })
  @IsOptional()
  assignedBy?: number;

  /**
   * 미션 설정
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '미션 활성화 여부',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '현재 제출 횟수',
  })
  submissionCount: number;

  /**
   * 생성 시간
   */
  @CreateDateColumn({ comment: '미션 할당 시간' })
  @Exclude()
  assignedAt: Date;

  /**
   * 관계 설정
   */
  @ManyToOne(() => Mission, (mission) => mission.missionTravels, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'missionId' })
  mission: Mission;

  @ManyToOne('Travel', 'missionTravels', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'travelId' })
  travel: any;

  @ManyToOne('Planet', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'planetId' })
  planet?: any;

  @ManyToOne('User', {
    nullable: true,
  })
  @JoinColumn({ name: 'assignedBy' })
  assignedByUser?: any;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 제출 가능 여부 확인
   */
  canSubmit(maxSubmissions?: number): boolean {
    if (!this.isActive) return false;
    if (!maxSubmissions) return true;
    return this.submissionCount < maxSubmissions;
  }

  /**
   * 제출 횟수 증가
   */
  incrementSubmissionCount(): void {
    this.submissionCount++;
  }

  /**
   * 미션 비활성화
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * 미션 활성화
   */
  activate(): void {
    this.isActive = true;
  }
}
