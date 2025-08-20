import { Logger } from '@nestjs/common';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength, MaxLength, IsUrl, IsInt, Min } from 'class-validator';
import {
  AfterInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { Accommodation } from '../accommodation/accommodation.entity';
import { Planet } from '../planet/planet.entity';
import { PlanetType } from '../planet/enums/planet-type.enum';
import { PlanetStatus } from '../planet/enums/planet-status.enum';
import { TravelStatus } from './enums/travel-status.enum';
import { TravelVisibility } from './enums/travel-visibility.enum';

@Entity('travels')
// 복합 인덱스 - 성능 향상
@Index(['status', 'endDate']) // 상태별 만료일 조회
@Index(['visibility', 'status']) // 공개 설정별 상태 조회
export class Travel extends BaseActiveRecord {
  private static readonly logger = new Logger(Travel.name);

  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 기본 정보
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: '여행 이름',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '여행 설명',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '여행 이미지 URL',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  /**
   * 상태 관리
   */
  @Column({
    type: 'enum',
    enum: TravelStatus,
    default: TravelStatus.INACTIVE,
    comment: '여행 상태',
  })
  @IsEnum(TravelStatus)
  @Index() // 상태별 조회 최적화
  status: TravelStatus;

  /**
   * 날짜 관리
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '여행 시작 예정 날짜',
  })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @Column({
    type: 'timestamp',
    comment: '여행 종료 예정 날짜 (채팅 만료 날짜)',
  })
  @IsDateString()
  @Index() // 종료/만료 날짜 정렬 최적화
  endDate: Date;

  /**
   * 숙박 업소 관계
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  accommodationId: number | null;

  @ManyToOne(() => Accommodation, (accommodation) => accommodation.travels, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'accommodationId' })
  accommodation: Accommodation | null;

  /**
   * 접근 제어
   */
  @Column({
    type: 'enum',
    enum: TravelVisibility,
    default: TravelVisibility.PUBLIC,
    comment: '공개 설정',
  })
  @IsEnum(TravelVisibility)
  @Index() // 공개 설정별 필터링
  visibility: TravelVisibility;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
    comment: '초대 코드 (공유용)',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Index() // 초대 코드 검색 최적화
  inviteCode?: string;

  /**
   * 관계 설정
   */
  @OneToMany('TravelUser', 'travel')
  travelUsers: any[];

  @OneToMany('Planet', 'travel')
  planets: any[];

  @OneToMany('MissionTravel', 'travel')
  missionTravels: any[];

  /**
   * Active Record 정적 메서드
   */

  // Simple finder methods removed - use TypeORM queries directly in controllers
  // Examples:
  // Travel.find({ where: { status: TravelStatus.ACTIVE }, order: { createdAt: 'DESC' } })
  // Travel.findOne({ where: { inviteCode } })
  // Travel.find({ where: { accommodationId }, order: { startDate: 'ASC' } })

  /**
   * 여행 생성
   */
  static async createTravel(travelData: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    maxMembers: number;
    visibility: TravelVisibility;
    accommodationId?: number;
  }): Promise<Travel> {
    const travel = this.create({
      ...travelData,
      status: TravelStatus.ACTIVE,
      currentMembers: 1, // 생성자 포함
      inviteCode: this.generateInviteCode(),
    } as any);
    return this.save(travel) as Promise<Travel>;
  }

  /**
   * 초대 코드 생성
   */
  private static generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * 여행 상태 업데이트
   */
  static async updateStatus(
    travelId: number,
    status: TravelStatus,
  ): Promise<void> {
    await this.update(travelId, { status });
  }

  /**
   * 만료된 여행들 자동 만료 처리
   */
  static async expireOldTravel(): Promise<number> {
    const now = new Date();
    const repository = this.getRepository();
    const result = await repository
      .createQueryBuilder()
      .update(Travel)
      .set({ status: TravelStatus.EXPIRED })
      .where('endDate < :now', { now })
      .execute();
    return result.affected || 0;
  }

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 만료 상태 확인
   */
  isExpired(): boolean {
    return new Date() > this.endDate;
  }

  /**
   * 진행 중 상태 확인
   */
  isOngoing(): boolean {
    return this.status === TravelStatus.ACTIVE && !this.isExpired();
  }

  /**
   * 가입 가능 상태 확인
   */
  canJoin(): boolean {
    return this.status === TravelStatus.ACTIVE && !this.isExpired();
  }

  /**
   * 초대 코드 생성
   */
  generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.inviteCode = result;
    return result;
  }

  /**
   * Travel 시작
   */
  start(): void {
    this.status = TravelStatus.ACTIVE;
    if (!this.startDate) {
      this.startDate = new Date();
    }
  }

  /**
   * Travel 비활성화 (취소/완료 시 사용)
   */
  deactivate(): void {
    this.status = TravelStatus.INACTIVE;
  }

  /**
   * 진행률 계산 (시작일 ~ 종료일 기준)
   */
  getProgress(): number {
    if (!this.startDate || !this.endDate) return 0;

    const now = Date.now();
    const start = this.startDate.getTime();
    const end = this.endDate.getTime();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }

  /**
   * 만료까지 남은 시간 (분 단위)
   */
  getMinutesUntilExpiry(): number {
    const now = new Date();
    const diffMs = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  }

  /**
   * 만료까지 남은 일 수
   */
  getDaysUntilExpiry(): number {
    return Math.ceil(this.getMinutesUntilExpiry() / (60 * 24));
  }

  /**
   * 만료 임박 여부 (지정된 일 수 이내)
   */
  isExpiryWarning(warningDays: number = 7): boolean {
    const daysUntil = this.getDaysUntilExpiry();
    return daysUntil > 0 && daysUntil <= warningDays;
  }

  /**
   * Travel 만료 처리
   * - 상태를 비활성으로 변경
   * - 만료 여부는 endDate로 판단
   */
  expire(): void {
    this.status = TravelStatus.INACTIVE;
  }

  /**
   * Travel 만료 복구 (관리자용)
   * - 종료 날짜 연장 후 호출
   */
  reactivateFromExpiry(): void {
    if (!this.isExpired()) {
      this.status = TravelStatus.ACTIVE;
    }
  }

  /**
   * 만료 상태 정보 반환
   */
  getExpiryStatus(): {
    isExpired: boolean;
    minutesUntilExpiry: number;
    daysUntilExpiry: number;
    isWarning: boolean;
    endDate: Date;
  } {
    return {
      isExpired: this.isExpired(),
      minutesUntilExpiry: this.getMinutesUntilExpiry(),
      daysUntilExpiry: this.getDaysUntilExpiry(),
      isWarning: this.isExpiryWarning(),
      endDate: this.endDate,
    };
  }

  /**
   * Travel 생성 후 자동으로 기본 Planet 생성
   * - 여행 참여자 단체 채팅 1개
   * - 공지사항 채팅 1개
   * 
   * N+1 쿼리 문제 해결: 벌크 insert 사용
   */
  @AfterInsert()
  async createDefaultPlanets(): Promise<void> {
    try {
      // 벌크 insert로 N+1 쿼리 문제 해결
      const planets = [
        {
          travelId: this.id,
          name: `${this.name} 참여자`,
          description: `${this.name} 여행 참여자 단체 채팅방`,
          type: PlanetType.GROUP,
          status: PlanetStatus.ACTIVE,
        },
        {
          travelId: this.id,
          name: `${this.name} 공지사항`,
          description: `${this.name} 여행 공지사항`,
          type: PlanetType.ANNOUNCEMENT,
          status: PlanetStatus.ACTIVE,
        }
      ];
      
      // 단일 쿼리로 처리
      await Planet.insert(planets);

      Travel.logger.log(`Default planets created for Travel ${this.id}: Group and Announcement`);
    } catch (error) {
      Travel.logger.error(`Failed to create default planets for Travel ${this.id}:`, error.stack);
      // Travel 생성은 성공했으므로 에러를 throw하지 않고 로그만 남김
    }
  }
}
