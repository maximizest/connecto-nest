import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsJSON,
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
import { Planet } from '../planet/planet.entity';
import { User } from '../user/user.entity';
import { PlanetUserStatus } from './enums/planet-user-status.enum';

@Entity('planet_users')
@Unique(['planetId', 'userId']) // Planet당 사용자는 하나의 레코드만
// 복합 인덱스 - 성능 향상
@Index(['planetId', 'status']) // Planet 내 활성 멤버 조회
export class PlanetUser extends BaseActiveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 관계 정보
   */
  @Column({ comment: 'Planet ID' })
  @IsNumber()
  @Index() // Planet별 멤버 조회 최적화
  planetId: number;

  @ManyToOne(() => Planet, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  @Column({ comment: '사용자 ID', nullable: true })
  @IsOptional()
  @IsNumber()
  @Index() // 사용자별 Planet 조회 최적화
  userId?: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /**
   * 하드 삭제 익명화 필드
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: '탈퇴한 사용자의 기록 여부',
  })
  @IsBoolean()
  @Index() // 탈퇴한 사용자 필터링
  isDeletedUser: boolean;

  /**
   * 상태
   */
  @Column({
    type: 'enum',
    enum: PlanetUserStatus,
    default: PlanetUserStatus.ACTIVE,
    comment: '참여 상태',
  })
  @IsEnum(PlanetUserStatus)
  @Index() // 상태별 필터링
  status: PlanetUserStatus;

  /**
   * 참여 정보
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '참여 날짜',
  })
  @IsDateString()
  @Index() // 가입 순서 정렬
  joinedAt: Date;

  /**
   * 알림 설정
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: '알림 활성화 여부',
  })
  @IsBoolean()
  notificationsEnabled: boolean;

  /**
   * 생성/수정 시간
   */
  @IsOptional()
  @IsDateString()

  @IsOptional()
  @IsDateString()

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 활성 참여자인지 확인
   */
  isActiveParticipant(): boolean {
    return this.status === PlanetUserStatus.ACTIVE;
  }

  /**
   * 차단된 상태인지 확인
   */
  isBanned(): boolean {
    return this.status === PlanetUserStatus.BANNED;
  }

  /**
   * 사용자 차단
   */
  ban(): void {
    this.status = PlanetUserStatus.BANNED;
  }

  /**
   * 사용자 차단 해제
   */
  unban(): void {
    this.status = PlanetUserStatus.ACTIVE;
  }

  /**
   * 알림 설정 토글
   */
  toggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
  }

  /**
   * 참여 기간 계산 (일 단위)
   */
  getParticipationDays(): number {
    const diffTime = Date.now() - this.joinedAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 사용자 표시 이름 반환 (탈퇴한 사용자 처리)
   */
  getUserDisplayName(fallbackName?: string): string {
    if (this.isDeletedUser) {
      return '탈퇴한 사용자';
    }

    return this.user?.name || fallbackName || '알 수 없음';
  }

  /**
   * 탈퇴한 사용자의 기록인지 확인
   */
  isFromDeletedUserAccount(): boolean {
    return this.isDeletedUser;
  }

  /**
   * Active Record Static Methods
   */

  /**
   * Planet의 모든 멤버 조회
   */
  static async findByPlanet(planetId: number): Promise<PlanetUser[]> {
    return this.find({
      where: { planetId },
      relations: ['user', 'planet'],
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * Planet의 활성 멤버 조회
   */
  static async findActiveMembersByPlanet(planetId: number): Promise<PlanetUser[]> {
    return this.find({
      where: { 
        planetId,
        status: PlanetUserStatus.ACTIVE,
      },
      relations: ['user', 'planet'],
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * 사용자의 모든 Planet 조회
   */
  static async findByUser(userId: number): Promise<PlanetUser[]> {
    return this.find({
      where: { userId },
      relations: ['user', 'planet'],
      order: { joinedAt: 'DESC' },
    });
  }

  /**
   * 사용자의 활성 Planet 조회
   */
  static async findActiveByUser(userId: number): Promise<PlanetUser[]> {
    return this.find({
      where: { 
        userId,
        status: PlanetUserStatus.ACTIVE,
      },
      relations: ['user', 'planet'],
      order: { joinedAt: 'DESC' },
    });
  }

  /**
   * 특정 사용자의 특정 Planet 멤버십 조회
   */
  static async findMembership(planetId: number, userId: number): Promise<PlanetUser | null> {
    return this.findOne({
      where: { planetId, userId },
      relations: ['user', 'planet'],
    });
  }

  /**
   * Planet 멤버 추가
   */
  static async addMember(memberData: {
    planetId: number;
    userId: number;
  }): Promise<PlanetUser> {
    const planetUser = this.create({
      planetId: memberData.planetId,
      userId: memberData.userId,
      status: PlanetUserStatus.ACTIVE,
      joinedAt: new Date(),
    });

    return await planetUser.save();
  }

  /**
   * Planet에서 멤버 제거
   */
  static async removeMember(planetId: number, userId: number): Promise<boolean> {
    const planetUser = await this.findMembership(planetId, userId);
    if (planetUser) {
      await planetUser.remove();
      return true;
    }
    return false;
  }

  /**
   * Planet의 활성 멤버 수 조회
   */
  static async countActiveMembers(planetId: number): Promise<number> {
    return this.count({
      where: { 
        planetId,
        status: PlanetUserStatus.ACTIVE,
      },
    });
  }

  /**
   * 사용자 탈퇴 시 기록 익명화
   */
  static async anonymizeUserRecords(userId: number): Promise<void> {
    await this.update(
      { userId },
      { 
        isDeletedUser: true,
        userId: undefined,
      }
    );
  }

  /**
   * Planet 삭제 시 관련 멤버십 정리
   */
  static async cleanupByPlanet(planetId: number): Promise<void> {
    await this.delete({ planetId });
  }
}
