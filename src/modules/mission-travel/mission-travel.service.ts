import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { MissionTravel } from './mission-travel.entity';

/**
 * MissionTravel Service - CrudService with Essential Business Logic
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공되며, 미션 할당 토글 등 특수 로직만 보존합니다.
 * 일반적인 할당 조회/관리는 Entity의 Active Record 메서드나 기본 CRUD를 직접 사용하세요.
 */
@Injectable()
export class MissionTravelService extends CrudService<MissionTravel> {
  constructor(
    @InjectRepository(MissionTravel)
    repository: Repository<MissionTravel>,
  ) {
    super(repository);
  }

  /**
   * 미션 할당 활성화/비활성화 (특수 비즈니스 로직 보존)
   */
  async toggleActive(id: number) {
    const missionTravel = await MissionTravel.findById(id);
    if (missionTravel) {
      missionTravel.active = !missionTravel.active;
      return await missionTravel.save();
    }
    return null;
  }
}
