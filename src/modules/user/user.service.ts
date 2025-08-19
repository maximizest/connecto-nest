import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { User } from './user.entity';
import { UserRole } from './enums/user-role.enum';
import { SocialProvider } from './enums/social-provider.enum';

/**
 * User Service - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 User 엔티티의 Active Record 메서드도 활용합니다.
 */
@Injectable()
export class UserService extends CrudService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }
  /**
   * 모든 사용자 조회
   */
  async findAll() {
    return User.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ID로 사용자 조회
   */
  async findById(id: number) {
    return User.findById(id);
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string) {
    return User.findByEmail(email);
  }

  /**
   * 소셜 ID로 사용자 조회
   */
  async findBySocialId(socialId: string, provider: SocialProvider) {
    return User.findBySocialId(socialId, provider);
  }

  /**
   * 활성 사용자 조회
   */
  async findActiveUsers() {
    return User.findActiveUsers();
  }

  /**
   * 밴된 사용자 조회
   */
  async findBannedUsers() {
    return User.findBannedUsers();
  }

  /**
   * 역할별 사용자 조회
   */
  async findByRole(role: UserRole) {
    return User.findByRole(role);
  }

  /**
   * 관리자 조회
   */
  async findAdmins() {
    return User.findAdmins();
  }

  /**
   * 호스트 조회
   */
  async findHosts() {
    return User.findHosts();
  }

  /**
   * 소셜 로그인 사용자 생성
   */
  async createSocialUser(userData: {
    email: string;
    name?: string;
    socialId: string;
    provider: SocialProvider;
    socialMetadata?: Record<string, any>;
  }) {
    return User.createSocialUser(userData);
  }

  /**
   * 관리자 생성
   */
  async createAdmin(userData: {
    email: string;
    name: string;
    password: string;
  }) {
    return User.createAdmin(userData);
  }

  /**
   * 사용자 업데이트
   */
  async updateUser(id: number, updateData: Partial<User>) {
    await User.update(id, updateData);
    return User.findById(id);
  }

  /**
   * 사용자 밴
   */
  async banUser(
    userId: number,
    reason: string,
    bannedBy: number,
    bannedUntil?: Date,
  ) {
    return User.banUser(userId, reason, bannedBy, bannedUntil);
  }

  /**
   * 사용자 밴 해제
   */
  async unbanUser(userId: number) {
    return User.unbanUser(userId);
  }

  /**
   * 사용자 삭제 (Soft Delete)
   */
  async deleteUser(id: number) {
    const user = await User.findById(id);
    if (user) {
      return user.remove();
    }
    return null;
  }

  /**
   * 사용자 존재 여부 확인
   */
  async exists(id: number) {
    return User.exists({ where: { id } });
  }

  /**
   * 사용자 수 조회
   */
  async count() {
    return User.count();
  }
}
