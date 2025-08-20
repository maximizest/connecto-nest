import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Planet } from './planet.entity';

/**
 * Planet Service - Basic CrudService Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: Planet.findByTravel(id), Planet.createPlanet(data), Planet.deactivateByTravel(id)
 */
@Injectable()
export class PlanetService extends CrudService<Planet> {
  constructor(
    @InjectRepository(Planet)
    repository: Repository<Planet>,
  ) {
    super(repository);
  }
}
