import { Injectable } from '@nestjs/common';
import { TravelUser } from './travel-user.entity';
import { TravelUserRole } from './enums/travel-user-role.enum';
import { TravelUserStatus } from './enums/travel-user-status.enum';

/**
 * TravelUser Service - Active Record Pattern
 * 
 * Repository 주입 없이 TravelUser 엔티티의 Active Record 메서드를 활용합니다.
 */
@Injectable()
export class TravelUserService {
  /**
   * ID로 TravelUser 조회
   */
  async findById(id: number) {
    return TravelUser.findById(id);
  }

  /**
   * Travel의 모든 멤버 조회
   */
  async findByTravel(travelId: number) {
    return TravelUser.findByTravel(travelId);
  }

  /**
   * Travel의 활성 멤버 조회
   */
  async findActiveMembersByTravel(travelId: number) {
    return TravelUser.findActiveMembersByTravel(travelId);
  }

  /**
   * 사용자의 모든 Travel 조회
   */
  async findByUser(userId: number) {
    return TravelUser.findByUser(userId);
  }

  /**
   * 사용자의 활성 Travel 조회
   */
  async findActiveByUser(userId: number) {
    return TravelUser.findActiveByUser(userId);
  }

  /**
   * Travel의 호스트 조회
   */
  async findHostsByTravel(travelId: number) {
    return TravelUser.findHostsByTravel(travelId);
  }

  /**
   * Travel의 역할별 멤버 조회
   */
  async findByTravelAndRole(travelId: number, role: TravelUserRole) {
    return TravelUser.findByTravelAndRole(travelId, role);
  }

  /**
   * 특정 사용자의 특정 Travel 멤버십 조회
   */
  async findMembership(travelId: number, userId: number) {
    return TravelUser.findMembership(travelId, userId);
  }

  /**
   * Travel 멤버 추가
   */
  async addMember(memberData: {
    travelId: number;
    userId: number;
    role?: TravelUserRole;
  }) {
    return TravelUser.addMember(memberData);
  }

  /**
   * Travel에서 멤버 제거
   */
  async removeMember(travelId: number, userId: number) {
    return TravelUser.removeMember(travelId, userId);
  }

  /**
   * TravelUser 업데이트
   */
  async updateTravelUser(id: number, updateData: Partial<TravelUser>) {
    await TravelUser.update(id, updateData);
    return TravelUser.findById(id);
  }

  /**
   * Travel의 멤버 수 조회
   */
  async countActiveMembers(travelId: number) {
    return TravelUser.countActiveMembers(travelId);
  }

  /**
   * TravelUser 수 조회
   */
  async count() {
    return TravelUser.count();
  }
}