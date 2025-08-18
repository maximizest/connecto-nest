import { IsDateString, IsOptional } from 'class-validator';
import { BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * 타임스탬프 기본 엔티티
 *
 * 모든 엔티티에서 공통으로 사용되는 생성/수정 시간 필드를 제공
 */
export abstract class BaseTimestampEntity extends BaseEntity {
  @CreateDateColumn({ comment: '생성 시간' })
  @IsOptional()
  @IsDateString()
  @Exclude()
  createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  @IsOptional()
  @IsDateString()
  @Exclude()
  updatedAt: Date;
}
