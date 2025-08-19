import { Injectable } from '@nestjs/common';
import { Travel } from './travel.entity';
import { TravelStatus } from './enums/travel-status.enum';
import { TravelVisibility } from './enums/travel-visibility.enum';

/**
 * Travel Service - Active Record Pattern
 *
 * Repository 주입 없이 Travel 엔티티의 Active Record 메서드를 활용합니다.
 */
@Injectable()
export class TravelService {
  /**
   * 모든 여행 조회
   */
  async findAll() {
    return Travel.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ID로 여행 조회
   */
  async findById(id: number) {
    return Travel.findById(id);
  }

  /**
   * 활성 여행 조회
   */
  async findActiveTravel() {
    return Travel.findActiveTravel();
  }

  /**
   * 공개 여행 조회
   */
  async findPublicTravel() {
    return Travel.findPublicTravel();
  }

  /**
   * 만료된 여행 조회
   */
  async findExpiredTravel() {
    return Travel.findExpiredTravel();
  }

  /**
   * 초대 코드로 여행 찾기
   */
  async findByInviteCode(inviteCode: string) {
    return Travel.findByInviteCode(inviteCode);
  }

  /**
   * 숙소별 여행 조회
   */
  async findByAccommodation(accommodationId: number) {
    return Travel.findByAccommodation(accommodationId);
  }

  /**
   * 기간별 여행 조회
   */
  async findByDateRange(startDate: Date, endDate: Date) {
    return Travel.findByDateRange(startDate, endDate);
  }

  /**
   * 여행 생성
   */
  async createTravel(travelData: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    maxMembers: number;
    visibility: TravelVisibility;
    accommodationId?: number;
  }) {
    return Travel.createTravel(travelData);
  }

  /**
   * 여행 업데이트
   */
  async updateTravel(id: number, updateData: Partial<Travel>) {
    await Travel.update(id, updateData);
    return Travel.findById(id);
  }

  /**
   * 여행 상태 업데이트
   */
  async updateStatus(travelId: number, status: TravelStatus) {
    return Travel.updateStatus(travelId, status);
  }

  /**
   * 여행 삭제
   */
  async deleteTravel(id: number) {
    const travel = await Travel.findById(id);
    if (travel) {
      return travel.remove();
    }
    return null;
  }

  /**
   * 만료된 여행들 자동 만료 처리
   */
  async expireOldTravel() {
    return Travel.expireOldTravel();
  }

  /**
   * 여행 존재 여부 확인
   */
  async exists(id: number) {
    return Travel.exists({ where: { id } });
  }

  /**
   * 여행 수 조회
   */
  async count() {
    return Travel.count();
  }
}
