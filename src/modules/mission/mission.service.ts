import { Injectable } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Mission } from './mission.entity';

/**
 * Mission Service - Active Record Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 */
@Injectable()
export class MissionService extends CrudService<Mission> {
  constructor() {
    super(Mission.getRepository());
  }
}
