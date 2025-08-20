import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Travel } from './travel.entity';
import { Planet } from '../planet/planet.entity';
import { PlanetType } from '../planet/enums/planet-type.enum';
import { PlanetStatus } from '../planet/enums/planet-status.enum';

/**
 * Travel Service - Active Record Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: Travel.findActiveTravel(), Travel.createTravel(data), Travel.expireOldTravel()
 */
@Injectable()
export class TravelService extends CrudService<Travel> {
  constructor(private dataSource: DataSource) {
    super(Travel.getRepository());
  }

  /**
   * Travel 생성 with 트랜잭션 처리
   * Travel과 기본 Planet들을 하나의 트랜잭션으로 생성
   */
  async createTravelWithPlanets(travelData: Partial<Travel>): Promise<Travel> {
    return await this.dataSource.transaction(async (manager) => {
      // Travel 생성
      const travel = manager.create(Travel, travelData);
      const savedTravel = await manager.save(travel);

      // 기본 Planet들 생성 (벌크 insert)
      const planets = [
        {
          travelId: savedTravel.id,
          name: `${savedTravel.name} 참여자`,
          description: `${savedTravel.name} 여행 참여자 단체 채팅방`,
          type: PlanetType.GROUP,
          status: PlanetStatus.ACTIVE,
        },
        {
          travelId: savedTravel.id,
          name: `${savedTravel.name} 공지사항`,
          description: `${savedTravel.name} 여행 공지사항`,
          type: PlanetType.ANNOUNCEMENT,
          status: PlanetStatus.ACTIVE,
        },
      ];

      await manager.insert(Planet, planets);

      return savedTravel;
    });
  }
}
