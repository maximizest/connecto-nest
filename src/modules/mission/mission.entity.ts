import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MissionType } from './enums/mission-type.enum';
import { MissionTarget } from './enums/mission-target.enum';
import { Exclude } from 'class-transformer';

@Entity('missions')
@Index(['type', 'target']) // 미션 타입별 조회 최적화
@Index(['startAt', 'endAt']) // 기간별 조회 최적화
@Index(['active']) // 활성 미션 조회 최적화
export class Mission extends BaseActiveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 미션 기본 정보
   */
  @Column({
    type: 'enum',
    enum: MissionType,
    comment: '미션 타입 (이미지, 비디오, 밸런스 게임)',
  })
  @IsEnum(MissionType)
  type: MissionType;

  @Column({
    type: 'enum',
    enum: MissionTarget,
    comment: '미션 대상 (개인/단체)',
  })
  @IsEnum(MissionTarget)
  target: MissionTarget;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '미션 제목',
  })
  @IsString()
  title: string;

  @Column({
    type: 'text',
    comment: '미션 설명',
  })
  @IsString()
  description: string;

  /**
   * 미션별 메타데이터
   * - 이미지/비디오: { maxFileSize?, allowedFormats? }
   * - 밸런스 게임: { questions: [{ question, optionA, optionB, order }] }
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '미션 타입별 추가 데이터',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  /**
   * 미션 기간 관리
   */
  @Column({
    type: 'timestamp',
    comment: '미션 시작 시간',
  })
  @IsDateString()
  @Index()
  startAt: Date;

  @Column({
    type: 'timestamp',
    comment: '미션 종료 시간',
  })
  @IsDateString()
  @Index()
  endAt: Date;

  /**
   * 상태 관리
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '미션 활성화 여부',
  })
  @IsBoolean()
  active: boolean;

  /**
   * 미션 설정
   */
  @Column({
    type: 'int',
    nullable: true,
    comment: '최대 제출 횟수 (null = 무제한)',
  })
  @IsOptional()
  maxSubmissions?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: '반복 제출 가능 여부',
  })
  @IsBoolean()
  allowResubmission: boolean;

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 미션 진행 중 여부 확인
   */
  isOngoing(): boolean {
    const now = new Date();
    return this.active && now >= this.startAt && now <= this.endAt;
  }

  /**
   * 미션 만료 여부 확인
   */
  isExpired(): boolean {
    return new Date() > this.endAt;
  }

  /**
   * 미션 시작 전 여부 확인
   */
  isUpcoming(): boolean {
    return new Date() < this.startAt;
  }

  /**
   * 미션 참여 가능 여부 확인
   */
  canParticipate(): boolean {
    return this.active && this.isOngoing();
  }

  /**
   * 미션 진행률 계산
   */
  getProgress(): number {
    const now = Date.now();
    const start = this.startAt.getTime();
    const end = this.endAt.getTime();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }

  /**
   * 남은 시간 계산 (시간 단위)
   */
  getHoursRemaining(): number {
    const now = new Date();
    const diffMs = this.endAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  }

  /**
   * 미션 상태 정보 반환
   */
  getStatus(): {
    active: boolean;
    isOngoing: boolean;
    isExpired: boolean;
    isUpcoming: boolean;
    progress: number;
    hoursRemaining: number;
  } {
    return {
      active: this.active,
      isOngoing: this.isOngoing(),
      isExpired: this.isExpired(),
      isUpcoming: this.isUpcoming(),
      progress: this.getProgress(),
      hoursRemaining: this.getHoursRemaining(),
    };
  }

  /**
   * 밸런스 게임 질문 검증
   */
  validateBalanceGameQuestions(): boolean {
    if (this.type !== MissionType.BALANCE_GAME) return true;

    const questions = this.metadata?.questions;
    if (!Array.isArray(questions) || questions.length === 0) return false;

    return questions.every(
      (q) =>
        q.question &&
        typeof q.question === 'string' &&
        q.optionA &&
        typeof q.optionA === 'string' &&
        q.optionB &&
        typeof q.optionB === 'string' &&
        typeof q.order === 'number',
    );
  }

  /**
   * Active Record Static Methods
   */

  // Simple finder methods removed - use TypeORM queries directly in controllers
  // Examples:
  // Mission.find({ where: { active: true }, order: { startAt: 'ASC' } })
  // Mission.find({ where: { type }, order: { createdAt: 'DESC' } })
  // Mission.find({ where: { target }, order: { createdAt: 'DESC' } })
  // Mission.createQueryBuilder('mission').where('mission.active = :active', { active: true }).andWhere('mission.startAt <= :now', { now }).andWhere('mission.endAt >= :now', { now }).orderBy('mission.startAt', 'ASC').getMany()

  /**
   * 미션 생성
   */
  static async createMission(missionData: {
    type: MissionType;
    target: MissionTarget;
    title: string;
    description?: string;
    content?: any;
    startAt: Date;
    endAt: Date;
    maxSubmissions?: number;
    allowResubmission?: boolean;
  }): Promise<Mission> {
    const mission = this.create({
      ...missionData,
      active: true,
    });

    return await mission.save();
  }

  /**
   * 미션 활성화/비활성화
   */
  static async toggleActive(missionId: number): Promise<Mission | null> {
    const mission = await this.findById(missionId);
    if (mission) {
      mission.active = !mission.active;
      return await mission.save();
    }
    return null;
  }

  /**
   * 만료된 미션 정리
   */
  static async cleanupExpiredMissions(): Promise<number> {
    const now = new Date();
    const result = await this.update(
      { endAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), active: true },
      { active: false },
    );

    return result.affected || 0;
  }
}
