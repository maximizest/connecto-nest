import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { User } from '../users/user.entity';

@Entity('posts')
@Index('IDX_POST_USER_ID', ['userId'])
@Index('IDX_POST_PUBLISHED', ['isPublished'])
@Index('IDX_POST_USER_PUBLISHED', ['userId', 'isPublished'])
@Index('IDX_POST_CREATED_AT', ['createdAt'])
@Index('IDX_POST_VIEW_COUNT', ['viewCount'])
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  @IsString()
  @IsNotEmpty()
  @Index('IDX_POST_TITLE')
  title: string;

  @Column({ type: 'text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  summary?: string;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // User와 ManyToOne 관계
  @Column({ name: 'userId' })
  userId: number;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn()
  @IsDateString()
  updatedAt: Date;
} 