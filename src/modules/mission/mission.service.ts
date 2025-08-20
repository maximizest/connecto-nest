import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Mission } from './mission.entity';

/**
 * Mission Service - CrudService with Essential Business Logic
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공되며, 미션 상태 관리 등 특수 로직만 보존합니다.
 * 일반적인 미션 조회/생성은 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: Mission.findActiveMissions(), Mission.createMission(data), Mission.findByType(type)
 */
@Injectable()
export class MissionService extends CrudService<Mission> {
  constructor(
    @InjectRepository(Mission)
    repository: Repository<Mission>,
  ) {
    super(repository);
  }

}
