import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanetUser } from './planet-user.entity';

/**
 * PlanetUser 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 *
 * 주요 기능:
 * - 1:1 Planet 멤버 관리 (초대, 수락, 거절)
 * - Planet 멤버십 조회 및 필터링
 * - 직접 Planet 접근 권한 관리
 */
@Injectable()
export class PlanetUserService extends CrudService<PlanetUser> {
  public readonly repository: Repository<PlanetUser>;

  constructor(
    @InjectRepository(PlanetUser)
    repository: Repository<PlanetUser>,
  ) {
    super(repository);
    this.repository = repository;
  }
}
