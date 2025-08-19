import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Mission } from './mission.entity';
import { MissionType } from './enums/mission-type.enum';
import { MissionTarget } from './enums/mission-target.enum';

/**
 * Mission Service - Hybrid Pattern (CrudService + Active Record)
 *
 * CrudService를 확장하면서 Mission 엔티티의 Active Record 메서드도 활용합니다.
 */
@Injectable()
export class MissionService extends CrudService<Mission> {
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
  ) {
    super(missionRepository);
  }
  /**
   * ID로 미션 조회
   */
  async findById(id: number) {
    return Mission.findById(id);
  }

  /**
   * 모든 미션 조회
   */
  async findAll() {
    return Mission.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 활성 미션 조회
   */
  async getActiveMissions() {
    return Mission.findActiveMissions();
  }

  /**
   * 진행 중인 미션 조회
   */
  async getOngoingMissions() {
    return Mission.findOngoingMissions();
  }

  /**
   * 타입별 미션 조회
   */
  async getMissionsByType(type: MissionType) {
    return Mission.findByType(type);
  }

  /**
   * 대상별 미션 조회
   */
  async getMissionsByTarget(target: MissionTarget) {
    return Mission.findByTarget(target);
  }

  /**
   * 미션 생성
   */
  async createMission(missionData: {
    type: MissionType;
    target: MissionTarget;
    title: string;
    description?: string;
    content?: any;
    startAt: Date;
    endAt: Date;
    maxSubmissions?: number;
    allowResubmission?: boolean;
  }) {
    return Mission.createMission(missionData);
  }

  /**
   * 미션 업데이트
   */
  async updateMission(id: number, updateData: Partial<Mission>) {
    await Mission.update(id, updateData);
    return Mission.findById(id);
  }

  /**
   * 미션 활성화/비활성화
   */
  async updateMissionStatus(missionId: number, isActive: boolean) {
    const mission = await Mission.findById(missionId);

    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다.');
    }

    mission.active = isActive;
    return await mission.save();
  }

  /**
   * 미션 토글
   */
  async toggleMissionActive(missionId: number) {
    return Mission.toggleActive(missionId);
  }

  /**
   * 미션 삭제
   */
  async deleteMission(id: number) {
    const mission = await Mission.findById(id);
    if (mission) {
      return mission.remove();
    }
    return null;
  }

  /**
   * 만료된 미션 정리
   */
  async cleanupExpiredMissions() {
    return Mission.cleanupExpiredMissions();
  }

  /**
   * 미션 수 조회
   */
  async count() {
    return Mission.count();
  }
}
