import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { MissionTravel } from './mission-travel.entity';

/**
 * MissionTravel Service - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 MissionTravel 엔티티의 Active Record 메서드도 활용합니다.
 */
@Injectable()
export class MissionTravelService extends CrudService<MissionTravel> {
  constructor(
    @InjectRepository(MissionTravel)
    private readonly missionTravelRepository: Repository<MissionTravel>,
  ) {
    super(missionTravelRepository);
  }
  /**
   * ID로 조회
   */
  async findById(id: number) {
    return MissionTravel.findById(id);
  }

  /**
   * 미션을 여행에 할당
   */
  async assignMissionToTravel(
    missionId: number,
    travelId: number,
    planetId?: number,
  ): Promise<MissionTravel> {
    const missionTravel = MissionTravel.create({
      missionId,
      travelId,
      planetId,
      active: true,
    });
    return await missionTravel.save();
  }

  /**
   * 여행의 미션 목록 조회
   */
  async getMissionsForTravel(travelId: number): Promise<MissionTravel[]> {
    return await MissionTravel.find({
      where: { travelId },
      relations: ['mission', 'planet'],
    });
  }

  /**
   * 미션이 할당된 여행 목록 조회
   */
  async getTravelsForMission(missionId: number): Promise<MissionTravel[]> {
    return await MissionTravel.find({
      where: { missionId },
      relations: ['travel', 'planet'],
    });
  }

  /**
   * 미션 할당 해제
   */
  async unassignMission(missionId: number, travelId: number): Promise<void> {
    await MissionTravel.delete({
      missionId,
      travelId,
    });
  }

  /**
   * 활성 미션 할당 조회
   */
  async getActiveMissionTravels() {
    return MissionTravel.find({
      where: { active: true },
      relations: ['mission', 'travel'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 미션 할당 활성화/비활성화
   */
  async toggleActive(id: number) {
    const missionTravel = await MissionTravel.findById(id);
    if (missionTravel) {
      missionTravel.active = !missionTravel.active;
      return await missionTravel.save();
    }
    return null;
  }

  /**
   * 수 조회
   */
  async count() {
    return MissionTravel.count();
  }
}
