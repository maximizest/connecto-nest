import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { PlanetUser } from './planet-user.entity';
import { PlanetUserStatus } from './enums/planet-user-status.enum';

/**
 * PlanetUser Service - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 PlanetUser 엔티티의 Active Record 메서드도 활용합니다.
 *
 * 주요 기능:
 * - Planet 멤버 관리 (초대, 수락, 거절)
 * - Planet 멤버십 조회 및 필터링
 * - 직접 Planet 접근 권한 관리
 */
@Injectable()
export class PlanetUserService extends CrudService<PlanetUser> {
  constructor(
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {
    super(planetUserRepository);
  }
  /**
   * ID로 PlanetUser 조회
   */
  async findById(id: number) {
    return PlanetUser.findById(id);
  }

  /**
   * Planet의 모든 멤버 조회
   */
  async findByPlanet(planetId: number) {
    return PlanetUser.findByPlanet(planetId);
  }

  /**
   * Planet의 활성 멤버 조회
   */
  async findActiveMembersByPlanet(planetId: number) {
    return PlanetUser.findActiveMembersByPlanet(planetId);
  }

  /**
   * 사용자의 모든 Planet 조회
   */
  async findByUser(userId: number) {
    return PlanetUser.findByUser(userId);
  }

  /**
   * 사용자의 활성 Planet 조회
   */
  async findActiveByUser(userId: number) {
    return PlanetUser.findActiveByUser(userId);
  }

  /**
   * 특정 사용자의 특정 Planet 멤버십 조회
   */
  async findMembership(planetId: number, userId: number) {
    return PlanetUser.findMembership(planetId, userId);
  }

  /**
   * Planet 멤버 추가
   */
  async addMember(memberData: { planetId: number; userId: number }) {
    return PlanetUser.addMember(memberData);
  }

  /**
   * Planet에서 멤버 제거
   */
  async removeMember(planetId: number, userId: number) {
    return PlanetUser.removeMember(planetId, userId);
  }

  /**
   * PlanetUser 업데이트
   */
  async updatePlanetUser(id: number, updateData: Partial<PlanetUser>) {
    await PlanetUser.update(id, updateData);
    return PlanetUser.findById(id);
  }

  /**
   * PlanetUser 삭제
   */
  async deletePlanetUser(id: number) {
    const planetUser = await PlanetUser.findById(id);
    if (planetUser) {
      return planetUser.remove();
    }
    return null;
  }

  /**
   * 사용자 차단
   */
  async banUser(planetId: number, userId: number) {
    await PlanetUser.update(
      { planetId, userId },
      { status: PlanetUserStatus.BANNED },
    );
    return PlanetUser.findMembership(planetId, userId);
  }

  /**
   * 사용자 차단 해제
   */
  async unbanUser(planetId: number, userId: number) {
    await PlanetUser.update(
      { planetId, userId },
      { status: PlanetUserStatus.ACTIVE },
    );
    return PlanetUser.findMembership(planetId, userId);
  }

  /**
   * Planet의 활성 멤버 수 조회
   */
  async countActiveMembers(planetId: number) {
    return PlanetUser.countActiveMembers(planetId);
  }

  /**
   * 사용자 탈퇴 시 기록 익명화
   */
  async anonymizeUserRecords(userId: number) {
    return PlanetUser.anonymizeUserRecords(userId);
  }

  /**
   * Planet 삭제 시 관련 멤버십 정리
   */
  async cleanupByPlanet(planetId: number) {
    return PlanetUser.cleanupByPlanet(planetId);
  }

  /**
   * PlanetUser 수 조회
   */
  async count() {
    return PlanetUser.count();
  }
}
