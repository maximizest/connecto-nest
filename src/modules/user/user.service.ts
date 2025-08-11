import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

/**
 * User 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 표준 CRUD 작업(index, show, create, update, destroy)을 제공합니다.
 *
 * 주요 기능:
 * - 사용자 프로필 조회 및 수정
 * - 소셜 로그인 연동 사용자 관리
 * - Travel/Planet 멤버십 관리
 * - 온라인 상태 및 활동 로그 관리
 */
@Injectable()
export class UserService extends CrudService<User> {
  public readonly repository: Repository<User>;

  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
  ) {
    super(repository);
    this.repository = repository;
  }
}
