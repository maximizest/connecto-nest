import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { PlanetUser } from './planet-user.entity';
import { PlanetUserStatus } from './enums/planet-user-status.enum';

/**
 * PlanetUser Service - CrudService with Essential Business Logic
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공되며, 밴/언밴 등 특수 로직만 보존합니다.
 * 일반적인 멤버십 조회/관리는 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: PlanetUser.findByPlanet(id), PlanetUser.addMember(data), PlanetUser.removeMember(id, user)
 */
@Injectable()
export class PlanetUserService extends CrudService<PlanetUser> {
  constructor(
    @InjectRepository(PlanetUser)
    repository: Repository<PlanetUser>,
  ) {
    super(repository);
  }

  /**
   * 사용자 차단 (특수 비즈니스 로직 보존)
   */
  async banUser(planetId: number, userId: number) {
    await PlanetUser.update(
      { planetId, userId },
      { status: PlanetUserStatus.BANNED },
    );
    return PlanetUser.findMembership(planetId, userId);
  }

  /**
   * 사용자 차단 해제 (특수 비즈니스 로직 보존)
   */
  async unbanUser(planetId: number, userId: number) {
    await PlanetUser.update(
      { planetId, userId },
      { status: PlanetUserStatus.ACTIVE },
    );
    return PlanetUser.findMembership(planetId, userId);
  }
}
