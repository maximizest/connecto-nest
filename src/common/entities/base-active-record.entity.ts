import {
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * Base Active Record Entity
 * 
 * TypeORM의 BaseEntity를 확장하여 Active Record 패턴을 제공합니다.
 * Repository 패턴 대신 Entity 자체에서 데이터 접근과 비즈니스 로직을 처리합니다.
 */
export abstract class BaseActiveRecord extends BaseEntity {
  /**
   * 생성/수정 시간
   */
  @CreateDateColumn({ comment: '생성 시간' })
  @Exclude()
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @Exclude()
  updatedAt: Date;

  /**
   * 비즈니스 로직 헬퍼: Active 상태 확인
   */
  isActive(): boolean {
    return (this as any).status === 'ACTIVE' || (this as any).isActive === true;
  }

  /**
   * 비즈니스 로직 헬퍼: 생성 후 경과 시간 (분)
   */
  getMinutesSinceCreated(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * 비즈니스 로직 헬퍼: 최근 업데이트 여부 (분 기준)
   */
  isRecentlyUpdated(minutes: number = 5): boolean {
    const now = new Date();
    const diffMs = now.getTime() - this.updatedAt.getTime();
    const minutesDiff = diffMs / (1000 * 60);
    return minutesDiff <= minutes;
  }

  /**
   * Active Record 공통 메서드: ID로 엔티티 찾기
   */
  static async findById<T extends BaseActiveRecord>(this: new () => T, id: number): Promise<T | null> {
    return (this as any).findOne({ where: { id } });
  }
}