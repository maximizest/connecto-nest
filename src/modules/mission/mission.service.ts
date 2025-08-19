import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Mission } from './mission.entity';

/**
 * Mission 서비스
 *
 * @foryourdev/nestjs-crud의 BaseService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 */
@Injectable()
export class MissionService extends CrudService<Mission> {
  public readonly repository: Repository<Mission>;
  constructor(
    @InjectRepository(Mission)
    repository: Repository<Mission>,
  ) {
    super(repository);
    this.repository = repository;
  }

  /**
   * 미션 활성화/비활성화
   */
  async updateMissionStatus(
    missionId: number,
    isActive: boolean,
  ): Promise<Mission> {
    const mission = await this.repository.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다.');
    }

    mission.isActive = isActive;
    return await this.repository.save(mission);
  }

  /**
   * 특정 타입의 미션 조회
   */
  async getMissionsByType(type: any): Promise<Mission[]> {
    return await this.repository.find({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 진행 중인 미션 조회
   */
  async getActiveMissions(): Promise<Mission[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
