import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { IsString, IsEmail, IsOptional, IsDateString, Allow } from 'class-validator';
import { Exclude } from 'class-transformer';

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
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
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
  @Exclude()
  role: UserRole;

  @Column({ type: 'enum', enum: SocialProvider, default: SocialProvider.LOCAL })
  provider: SocialProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Exclude()
  providerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Exclude()
  refreshToken?: string | null;

  @CreateDateColumn()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn()
  @IsDateString()
  updatedAt: Date;
}
