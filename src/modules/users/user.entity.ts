import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  Index,
} from 'typeorm';
import { IsString, IsEmail, IsOptional, IsDateString, Allow, IsEnum } from 'class-validator';
import { Exclude } from 'class-transformer';
import { Post } from '../posts/post.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum SocialProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
  KAKAO = 'kakao',
  NAVER = 'naver',
}

@Entity('users')
@Index('IDX_USER_EMAIL', ['email'])
@Index('IDX_USER_PROVIDER', ['provider'])
@Index('IDX_USER_EMAIL_PROVIDER', ['email', 'provider'])
@Index('IDX_USER_CREATED_AT', ['createdAt'])
@Index('IDX_USER_ROLE', ['role'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @Index('IDX_USER_NAME')
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  @IsEmail()
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Exclude()
  password?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ type: 'enum', enum: SocialProvider, default: SocialProvider.LOCAL })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Exclude()
  @Index('IDX_USER_PROVIDER_ID')
  providerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Exclude()
  refreshToken?: string | null;

  @CreateDateColumn()
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn()
  @IsOptional()
  @IsDateString()
  updatedAt: Date;

  // Post와 OneToMany 관계
  @OneToMany(() => Post, (post) => post.user, {
    cascade: true,
  })
  posts: Post[];
}
