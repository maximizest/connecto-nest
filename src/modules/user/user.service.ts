import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { CrudService, BeforeCreate, AfterCreate, BeforeUpdate, AfterUpdate } from '@foryourdev/nestjs-crud';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UserRole } from './enums/user-role.enum';
import { ProfileService } from '../profile/profile.service';
import { RedisService } from '../cache/redis.service';

/**
 * User Service - Enhanced with Lifecycle Hooks
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * Service 레이어 생명주기 훅을 활용하여 비즈니스 로직을 처리합니다.
 */
@Injectable()
export class UserService extends CrudService<User> {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(forwardRef(() => ProfileService))
    private readonly profileService: ProfileService,
    private readonly redisService: RedisService,
  ) {
    super(User.getRepository());
  }

  /**
   * 사용자 생성 전 처리
   * - 관리자 계정의 경우 비밀번호 해싱
   * - 이메일 중복 검증
   */
  @BeforeCreate()
  async beforeCreateUser(entity: User): Promise<void> {
    // 관리자 계정의 비밀번호 해싱
    if (entity.role === UserRole.ADMIN && entity.password) {
      const salt = await bcrypt.genSalt(10);
      entity.password = await bcrypt.hash(entity.password, salt);
      this.logger.log(`Password hashed for admin user: ${entity.email}`);
    }

    // 이메일 중복 검증
    const existingUser = await User.findOne({ where: { email: entity.email } });
    if (existingUser) {
      throw new Error(`Email already exists: ${entity.email}`);
    }
  }

  /**
   * 사용자 생성 후 처리
   * - 프로필 자동 생성
   */
  @AfterCreate()
  async afterCreateUser(entity: User): Promise<void> {
    this.logger.log(`New user created: ${entity.id} - ${entity.email}`);

    // 기본 프로필 생성 (비동기 처리)
    this.profileService.createDefaultProfile(entity.id).catch(error => {
      this.logger.error(`Failed to create profile for user ${entity.id}`, error);
    });
  }

  /**
   * 사용자 업데이트 전 처리
   * - 비밀번호 변경 시 해싱
   * - 역할 변경 시 권한 검증
   */
  @BeforeUpdate()
  async beforeUpdateUser(entity: User, originalEntity: User): Promise<void> {
    // 비밀번호 변경 시 해싱
    if (entity.password && entity.password !== originalEntity.password) {
      const salt = await bcrypt.genSalt(10);
      entity.password = await bcrypt.hash(entity.password, salt);
      this.logger.log(`Password updated for user: ${entity.id}`);
    }

    // 역할 변경 시 로깅
    if (entity.role !== originalEntity.role) {
      this.logger.warn(
        `User role changed: ${entity.id} from ${originalEntity.role} to ${entity.role}`,
      );
    }
  }

  /**
   * 사용자 업데이트 후 처리
   * - 중요 변경사항 감사 로깅
   * - 관련 캐시 무효화
   */
  @AfterUpdate()
  async afterUpdateUser(entity: User, originalEntity: User): Promise<void> {
    // 중요 필드 변경 감사 로깅
    const importantFields = ['email', 'role', 'isBanned'];
    for (const field of importantFields) {
      if (entity[field] !== originalEntity[field]) {
        this.logger.log(
          `Audit: User ${entity.id} ${field} changed from ${originalEntity[field]} to ${entity[field]}`,
        );
      }
    }

    // Redis 캐시 무효화
    await this.invalidateUserCache(entity.id);
  }

  /**
   * 사용자 관련 캐시 무효화
   * @param userId 사용자 ID
   */
  private async invalidateUserCache(userId: number): Promise<void> {
    try {
      const cacheKeys = [
        `user:${userId}`,
        `user:${userId}:profile`,
        `user:${userId}:travels`,
        `user:${userId}:planets`,
        `user:${userId}:messages`,
      ];

      // 각 캐시 키 삭제
      for (const key of cacheKeys) {
        await this.redisService.del(key);
      }

      this.logger.log(`Cache invalidated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for user ${userId}`, error);
    }
  }
}
