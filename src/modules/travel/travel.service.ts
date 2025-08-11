import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel } from './travel.entity';

/**
 * Travel 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 *
 * 커스텀 비즈니스 로직은 컨트롤러의 lifecycle hooks에서 처리됩니다.
 */
@Injectable()
export class TravelService extends CrudService<Travel> {
  public readonly repository: Repository<Travel>;

  constructor(
    @InjectRepository(Travel)
    repository: Repository<Travel>,
  ) {
    super(repository);
    this.repository = repository;
  }
}
