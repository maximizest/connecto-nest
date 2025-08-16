import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

/**
 * 성별
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

/**
 * 사용자 프로필 엔티티
 *
 * User와 1:1 관계를 가지는 상세 프로필 정보
 */
@Entity('profiles')
// 복합 인덱스 - 성능 향상
@Index(['gender', 'age']) // 성별별 나이대 조회
@Index(['occupation', 'age']) // 직업별 나이대 조회
export class Profile extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User와의 관계 (1:1)
   */
  @Column({ comment: '사용자 ID', unique: true })
  @IsNumber()
  @Index() // 사용자별 프로필 조회 최적화
  userId: number;

  @OneToOne(() => User, (user) => user.profile, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 기본 프로필 정보
   */
  @Column({
    type: 'varchar',
    length: 50,
    comment: '닉네임',
  })
  @IsString()
  @Index() // 닉네임 검색 최적화
  nickname: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '실제 이름',
  })
  @IsString()
  @Index() // 이름 검색 최적화
  name: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    comment: '성별',
  })
  @IsOptional()
  @IsEnum(Gender)
  @Index() // 성별별 조회 최적화
  gender?: Gender;

  @Column({
    type: 'int',
    nullable: true,
    comment: '나이',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(150)
  @Index() // 나이대별 조회 최적화
  age?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '직업',
  })
  @IsOptional()
  @IsString()
  @Index() // 직업별 조회 최적화
  occupation?: string;

  /**
   * 생성/수정 시간 (BaseEntity에서 상속)
   */

  /**
   * 비즈니스 로직 메서드
   */

  /**
   * 프로필 완성도 계산 (%)
   */
  getCompletionRate(): number {
    const fields = [
      this.nickname,
      this.name,
      this.gender,
      this.age,
      this.occupation,
    ];

    const completedFields = fields.filter(
      (field) => field !== null && field !== undefined && field !== '',
    ).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * 나이대 반환 (10대, 20대, etc.)
   */
  getAgeGroup(): string | null {
    if (!this.age) return null;
    const ageGroup = Math.floor(this.age / 10) * 10;
    return `${ageGroup}대`;
  }

  /**
   * 표시용 이름 반환 (닉네임 우선, 없으면 이름)
   */
  getDisplayName(): string {
    return this.nickname || this.name || 'Unknown';
  }

  /**
   * 공개 프로필 정보 반환
   */
  getPublicProfile(): Partial<Profile> {
    return {
      id: this.id,
      nickname: this.nickname,
      name: this.name,
      gender: this.gender,
      age: this.age,
      occupation: this.occupation,
    };
  }

  // =================================================================
  // TypeORM Lifecycle Hooks (Entity Level)
  // =================================================================

  /**
   * 프로필 생성 전 기본값 설정
   * - 닉네임이 없으면 이름 사용
   * - 나이 유효성 검사
   */
  @BeforeInsert()
  beforeInsert() {
    // 닉네임이 없으면 이름을 사용
    if (!this.nickname && this.name) {
      this.nickname = this.name;
    }

    // 나이 유효성 검사
    if (this.age !== undefined && this.age !== null) {
      const age = Number(this.age);
      if (isNaN(age) || age < 1 || age > 150) {
        throw new Error('나이는 1~150 사이의 숫자여야 합니다.');
      }
      this.age = age;
    }
  }

  /**
   * 프로필 수정 전 데이터 검증 및 처리
   * - 닉네임이 비어있으면 이름 사용
   * - 나이 유효성 검사
   */
  @BeforeUpdate()
  beforeUpdate() {
    // 닉네임이 비어있으면 이름을 사용
    if (this.nickname === '' && this.name) {
      this.nickname = this.name;
    }

    // 나이 유효성 검사
    if (this.age !== undefined && this.age !== null) {
      const age = Number(this.age);
      if (isNaN(age) || age < 1 || age > 150) {
        throw new Error('나이는 1~150 사이의 숫자여야 합니다.');
      }
      this.age = age;
    }
  }
}
