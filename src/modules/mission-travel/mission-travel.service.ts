import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { MissionTravel } from './mission-travel.entity';

@Injectable()
export class MissionTravelService extends CrudService<MissionTravel> {
  public readonly repository: Repository<MissionTravel>;
  constructor(
    @InjectRepository(MissionTravel)
    repository: Repository<MissionTravel>,
  ) {
    super(repository);
    this.repository = repository;
  }

  /**
   * 미션을 여행에 할당
   */
  async assignMissionToTravel(
    missionId: number,
    travelId: number,
    planetId?: number,
  ): Promise<MissionTravel> {
    const missionTravel = this.repository.create({
      missionId,
      travelId,
      planetId,
      assignedAt: new Date(),
    });
    return await this.repository.save(missionTravel);
  }

  /**
   * 여행의 미션 목록 조회
   */
  async getMissionsForTravel(travelId: number): Promise<MissionTravel[]> {
    return await this.repository.find({
      where: { travelId },
      relations: ['mission', 'planet'],
    });
  }

  /**
   * 미션이 할당된 여행 목록 조회
   */
  async getTravelsForMission(missionId: number): Promise<MissionTravel[]> {
    return await this.repository.find({
      where: { missionId },
      relations: ['travel', 'planet'],
    });
  }

  /**
   * 미션 할당 해제
   */
  async unassignMission(missionId: number, travelId: number): Promise<void> {
    await this.repository.delete({
      missionId,
      travelId,
    });
  }
}
