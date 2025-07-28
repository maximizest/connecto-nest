import { Exclude } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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
@Index('IDX_USER_PROVIDER_ID', ['providerId'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  @IsOptional()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsString()
  name?: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @Exclude()
  password?: string;

  @Column({ type: 'enum', enum: SocialProvider, default: SocialProvider.LOCAL })
  @IsEnum(SocialProvider)
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
  @IsOptional()
  @IsDateString()
  createdAt: Date;

  @UpdateDateColumn()
  @IsOptional()
  @IsDateString()
  updatedAt: Date;
}
