import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { BaseActiveRecord } from '../../common/entities/base-active-record.entity';
import { User } from '../user/user.entity';
import { IsEnum, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';

export enum PushTokenPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

/**
 * Push Token Entity
 * 
 * 사용자의 푸시 알림 토큰을 관리합니다.
 * FCM/APNS 토큰을 저장하고 디바이스별로 관리합니다.
 */
@Entity('push_tokens')
@Index(['userId', 'deviceId'], { unique: true })
@Index(['token'])
@Index(['platform'])
@Index(['isActive'])
@Index(['userId', 'isActive'])
export class PushToken extends BaseActiveRecord {
  @PrimaryGeneratedColumn({ comment: '푸시 토큰 ID' })
  id: number;

  @Column({ comment: '사용자 ID' })
  @IsNotEmpty()
  userId: number;

  @Column({ type: 'varchar', length: 500, comment: 'FCM/APNS 토큰' })
  @IsNotEmpty()
  token: string;

  @Column({
    type: 'enum',
    enum: PushTokenPlatform,
    comment: '플랫폼 (ios/android/web)',
  })
  @IsEnum(PushTokenPlatform)
  platform: PushTokenPlatform;

  @Column({ type: 'varchar', length: 255, comment: '디바이스 고유 ID' })
  @IsNotEmpty()
  deviceId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '앱 버전',
  })
  @IsOptional()
  appVersion?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '디바이스 모델명',
  })
  @IsOptional()
  deviceModel?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'OS 버전',
  })
  @IsOptional()
  osVersion?: string;

  @Column({ type: 'boolean', default: true, comment: '활성 상태' })
  @IsBoolean()
  isTokenActive: boolean;

  @Column({ type: 'timestamp', nullable: true, comment: '마지막 사용 시간' })
  lastUsedAt?: Date;

  @Column({ type: 'int', default: 0, comment: '푸시 전송 실패 횟수' })
  failureCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '마지막 실패 시간',
  })
  lastFailureAt?: Date | null;

  @Column({ type: 'json', nullable: true, comment: '메타데이터' })
  @Exclude()
  metadata?: Record<string, any>;

  @CreateDateColumn({ comment: '생성 시간' })
  declare createdAt: Date;

  @UpdateDateColumn({ comment: '수정 시간' })
  declare updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  validateToken() {
    if (this.token && this.token.length > 500) {
      throw new Error('Token is too long (max 500 characters)');
    }
  }

  // Active Record Methods
  static async findByUserId(userId: number): Promise<PushToken[]> {
    return this.find({
      where: { userId, isTokenActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  static async findByDeviceId(
    userId: number,
    deviceId: string,
  ): Promise<PushToken | null> {
    return this.findOne({
      where: { userId, deviceId },
    });
  }

  static async deactivateToken(
    userId: number,
    deviceId: string,
  ): Promise<boolean> {
    const token = await this.findByDeviceId(userId, deviceId);
    if (token) {
      token.isTokenActive = false;
      await token.save();
      return true;
    }
    return false;
  }

  static async upsertToken(data: {
    userId: number;
    token: string;
    platform: PushTokenPlatform;
    deviceId: string;
    appVersion?: string;
    deviceModel?: string;
    osVersion?: string;
  }): Promise<PushToken> {
    let pushToken = await this.findByDeviceId(data.userId, data.deviceId);

    if (pushToken) {
      // Update existing token
      pushToken.token = data.token;
      pushToken.platform = data.platform;
      pushToken.appVersion = data.appVersion;
      pushToken.deviceModel = data.deviceModel;
      pushToken.osVersion = data.osVersion;
      pushToken.isTokenActive = true;
      pushToken.failureCount = 0;
      pushToken.lastFailureAt = null;
    } else {
      // Create new token
      pushToken = new PushToken();
      Object.assign(pushToken, data);
    }

    return pushToken.save();
  }

  static async incrementFailure(tokenId: number): Promise<void> {
    await this.update(tokenId, {
      failureCount: () => 'failureCount + 1',
      lastFailureAt: new Date(),
    });

    // Deactivate after 5 consecutive failures
    const token = await this.findOne({ where: { id: tokenId } });
    if (token && token.failureCount >= 5) {
      token.isTokenActive = false;
      await token.save();
    }
  }

  static async recordUsage(tokenId: number): Promise<void> {
    await this.update(tokenId, {
      lastUsedAt: new Date(),
      failureCount: 0,
    });
  }
}