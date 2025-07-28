import { Exclude } from 'class-transformer';
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admins')
@Index('IDX_ADMIN_EMAIL', ['email'])
export class Admin extends BaseEntity {
  @PrimaryGeneratedColumn()
  @IsOptional()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @Exclude()
  password: string;

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
