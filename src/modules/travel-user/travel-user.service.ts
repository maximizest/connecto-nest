import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Repository } from 'typeorm';
import { TravelUser } from './travel-user.entity';

/**
 * TravelUser 서비스
 * 
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 * 
 * 주요 기능:
 * - Travel 멤버 관리 (가입, 탈퇴, 권한 변경)
 * - 초대 코드 검증 및 가입 처리
 * - 멤버 목록 조회 및 필터링
 */
@Injectable()
export class TravelUserService extends CrudService<TravelUser> {
  public readonly repository: Repository<TravelUser>;

  constructor(
    @InjectRepository(TravelUser)
    repository: Repository<TravelUser>,
  ) {
    super(repository);
    this.repository = repository;
  }
}
