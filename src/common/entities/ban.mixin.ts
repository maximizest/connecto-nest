import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';
import { Column } from 'typeorm';

/**
 * Ban 기능 믹스인
 *
 * 엔티티에 ban 기능을 추가하는 공통 필드와 메서드를 제공
 */
export abstract class BanMixin {
  @Column({
    type: 'boolean',
    default: false,
    comment: '차단 여부',
  })
  @IsBoolean()
  isBanned: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '차단 시간',
  })
  @IsOptional()
  @IsDateString()
  bannedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '차단 사유',
  })
  @IsOptional()
  @IsString()
  banReason?: string;

  /**
   * 사용자 차단
   */
  banUser(reason?: string): void {
    this.isBanned = true;
    this.bannedAt = new Date();
    this.banReason = reason;
  }

  /**
   * 차단 해제
   */
  unbanUser(): void {
    this.isBanned = false;
    this.bannedAt = undefined;
    this.banReason = undefined;
  }

  /**
   * 현재 차단 상태 확인
   */
  isBannedNow(): boolean {
    return this.isBanned;
  }

  /**
   * 차단 정보 조회
   */
  getBanInfo(): {
    isBanned: boolean;
    bannedAt?: Date;
    banReason?: string;
  } {
    return {
      isBanned: this.isBanned,
      bannedAt: this.bannedAt,
      banReason: this.banReason,
    };
  }
}
