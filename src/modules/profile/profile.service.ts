import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Profile } from './profile.entity';
import { Gender } from './enums/gender.enum';

/**
 * Profile Service - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Profile 엔티티의 Active Record 메서드도 활용합니다.
 */
@Injectable()
export class ProfileService extends CrudService<Profile> {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {
    super(profileRepository);
  }
  /**
   * ID로 프로필 조회
   */
  async findById(id: number) {
    return Profile.findById(id);
  }

  /**
   * 사용자 ID로 프로필 조회
   */
  async findByUserId(userId: number) {
    return Profile.findByUserId(userId);
  }

  /**
   * 닉네임으로 프로필 조회
   */
  async findByNickname(nickname: string) {
    return Profile.findByNickname(nickname);
  }

  /**
   * 나이대별 프로필 조회
   */
  async findByAgeRange(minAge: number, maxAge: number) {
    return Profile.findByAgeRange(minAge, maxAge);
  }

  /**
   * 성별별 프로필 조회
   */
  async findByGender(gender: Gender) {
    return Profile.findByGender(gender);
  }

  /**
   * 직업별 프로필 조회
   */
  async findByOccupation(occupation: string) {
    return Profile.findByOccupation(occupation);
  }

  /**
   * 프로필 생성
   */
  async createProfile(profileData: {
    userId: number;
    nickname: string;
    name: string;
    gender?: Gender;
    age?: number;
    occupation?: string;
  }) {
    return Profile.createProfile(profileData);
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(id: number, updateData: Partial<Profile>) {
    await Profile.update(id, updateData);
    return Profile.findById(id);
  }

  /**
   * 프로필 삭제
   */
  async deleteProfile(id: number) {
    const profile = await Profile.findById(id);
    if (profile) {
      return profile.remove();
    }
    return null;
  }

  /**
   * 프로필 완성도별 조회
   */
  async findByCompletionRate(minRate: number) {
    return Profile.findByCompletionRate(minRate);
  }

  /**
   * 프로필 수 조회
   */
  async count() {
    return Profile.count();
  }
}
