import { Injectable, Logger } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Profile } from './profile.entity';

/**
 * Profile Service - Active Record Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 */
@Injectable()
export class ProfileService extends CrudService<Profile> {
  private readonly logger = new Logger(ProfileService.name);

  constructor() {
    super(Profile.getRepository());
  }

  /**
   * 사용자를 위한 기본 프로필 생성
   * @param userId 사용자 ID
   * @returns 생성된 프로필
   */
  async createDefaultProfile(userId: number): Promise<Profile> {
    try {
      // 이미 프로필이 있는지 확인
      const existingProfile = await Profile.findOne({ where: { userId } });
      if (existingProfile) {
        this.logger.log(`Profile already exists for user ${userId}`);
        return existingProfile;
      }

      // 기본 프로필 생성
      const profile = new Profile();
      profile.userId = userId;
      
      const savedProfile = await profile.save();
      this.logger.log(`Default profile created for user ${userId}`);
      
      return savedProfile;
    } catch (error) {
      this.logger.error(`Failed to create default profile for user ${userId}`, error);
      throw error;
    }
  }
}
