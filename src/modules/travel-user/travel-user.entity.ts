import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import { TravelUserRole } from './enums/travel-user-role.enum';
import { TravelUserStatus } from './enums/travel-user-status.enum';

@Entity('travel_users')
@Unique(['travelId', 'userId']) // Travel당 사용자는 하나의 레코드만
// 복합 인덱스 - 성능 향상
@Index(['travelId', 'status']) // Travel 내 활성 멤버 조회
@Index(['travelId', 'role']) // Travel 내 역할별 조회
@Index(['userId', 'status']) // 사용자별 활성 Travel 조회
@Index(['status', 'joinedAt']) // 상태별 가입순 정렬
@Index(['travelId', 'status', 'role']) // Travel 내 상태별 역할 조회
@Index(['userId', 'joinedAt']) // 사용자별 가입순 Travel
export class TravelUser extends BaseActiveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: 'Travel ID' })
  @IsNumber()
  @Index() // Travel별 멤버 조회 최적화
  travelId: number;

  @ManyToOne(() => Travel, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'travelId' })
  travel: Travel;

  @Column({ comment: '사용자 ID' })
  @IsNumber()
  @Index() // 사용자별 Travel 조회 최적화
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 역할 및 권한
   */
  @Column({
    type: 'enum',
    enum: TravelUserRole,
    default: TravelUserRole.PARTICIPANT,
    comment: 'Travel 내 역할',
  })
  @IsEnum(TravelUserRole)
  @Index() // 역할별 필터링
  role: TravelUserRole;

  @Column({
    type: 'enum',
    enum: TravelUserStatus,
    default: TravelUserStatus.ACTIVE,
    comment: '참여 상태',
  })
  @IsEnum(TravelUserStatus)
  @Index() // 상태별 필터링
  status: TravelUserStatus;

  /**
   * 가입 및 활동 정보
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '가입 날짜',
  })
  @IsDateString()
  @Index() // 가입 순서 정렬
  joinedAt: Date;

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
    type: 'text',
    nullable: true,
    comment: '정지 사유',
  })
  @IsOptional()
  banReason?: string;

  /**
   * Active Record 정적 메서드
   */

  /**
   * Travel의 모든 멤버 조회
   */
  static async findByTravel(travelId: number): Promise<TravelUser[]> {
    return this.find({
      where: { travelId },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });
  }

  /**
   * Travel의 활성 멤버 조회
   */
  static async findActiveMembersByTravel(
    travelId: number,
  ): Promise<TravelUser[]> {
    return this.find({
      where: {
        travelId,
        status: TravelUserStatus.ACTIVE,
      },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });
  }

  /**
   * 사용자의 모든 Travel 조회
   */
  static async findByUser(userId: number): Promise<TravelUser[]> {
    return this.find({
      where: { userId },
      order: { joinedAt: 'DESC' },
      relations: ['travel'],
    });
  }

  /**
   * 사용자의 활성 Travel 조회
   */
  static async findActiveByUser(userId: number): Promise<TravelUser[]> {
    return this.find({
      where: {
        userId,
        status: TravelUserStatus.ACTIVE,
      },
      order: { joinedAt: 'DESC' },
      relations: ['travel'],
    });
  }

  /**
   * Travel의 호스트 조회
   */
  static async findHostsByTravel(travelId: number): Promise<TravelUser[]> {
    return this.find({
      where: {
        travelId,
        role: TravelUserRole.HOST,
      },
      relations: ['user'],
    });
  }

  /**
   * Travel의 따로 역할 담김 멤버 조회
   */
  static async findByTravelAndRole(
    travelId: number,
    role: TravelUserRole,
  ): Promise<TravelUser[]> {
    return this.find({
      where: { travelId, role },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });
  }

  /**
   * 특정 사용자의 특정 Travel 멤버십 조회
   */
  static async findMembership(
    travelId: number,
    userId: number,
  ): Promise<TravelUser | null> {
    return this.findOne({
      where: { travelId, userId },
      relations: ['travel', 'user'],
    });
  }

  /**
   * Travel 멤버 추가
   */
  static async addMember(memberData: {
    travelId: number;
    userId: number;
    role?: TravelUserRole;
  }): Promise<TravelUser> {
    const member = this.create({
      ...memberData,
      role: memberData.role || TravelUserRole.PARTICIPANT,
      status: TravelUserStatus.ACTIVE,
      joinedAt: new Date(),
    });
    return this.save(member);
  }

  /**
   * Travel에서 멤버 제거
   */
  static async removeMember(
    travelId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.delete({ travelId, userId });
    return (result.affected || 0) > 0;
  }

  /**
   * Travel의 멤버 수 조회
   */
  static async countActiveMembers(travelId: number): Promise<number> {
    return this.count({
      where: {
        travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });
  }

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 호스트인지 확인
   */
  isHost(): boolean {
    return this.role === TravelUserRole.HOST;
  }

  /**
   * 활성 멤버인지 확인
   */
  isActiveMember(): boolean {
    return this.status === TravelUserStatus.ACTIVE && !this.isBannedNow();
  }

  /**
   * 현재 정지 상태인지 확인 (여행 내 채팅 불가)
   */
  isBannedNow(): boolean {
    return this.isBanned;
  }

  /**
   * 사용자 정지 (여행 내 채팅 불가)
   */
  banUser(reason?: string): void {
    this.isBanned = true;
    this.bannedAt = new Date();
    this.banReason = reason;
    this.status = TravelUserStatus.BANNED;
  }

  /**
   * 사용자 정지 해제
   */
  unbanUser(): void {
    this.isBanned = false;
    this.bannedAt = undefined;
    this.banReason = undefined;
    this.status = TravelUserStatus.ACTIVE;
  }

  /**
   * 역할 변경
   */
  changeRole(newRole: TravelUserRole): void {
    this.role = newRole;
  }

  /**
   * 호스트로 승격
   */
  promoteToHost(): void {
    this.role = TravelUserRole.HOST;
  }

  /**
   * 참가자로 변경
   */
  demoteToParticipant(): void {
    this.role = TravelUserRole.PARTICIPANT;
  }

  /**
   * 가입 기간 계산 (일 단위)
   */
  getMembershipDays(): number {
    const diffTime = Date.now() - this.joinedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
