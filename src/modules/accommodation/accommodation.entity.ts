import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { Travel } from '../travel/travel.entity';

/**
 * Accommodation 엔티티
 * 
 * 숙박 업소 정보를 관리합니다.
 * 하나의 숙박 업소는 여러 개의 Travel을 가질 수 있습니다.
 */
@Entity('accommodations')
export class Accommodation extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string; // 숙소명

  @Column({ type: 'text', nullable: true })
  description: string | null; // 숙소 설명

  // ==================== Relations ====================

  @OneToMany(() => Travel, (travel) => travel.accommodation)
  travels: Travel[];

  // ==================== Timestamps ====================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}