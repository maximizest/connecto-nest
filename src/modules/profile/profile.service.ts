import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';

/**
 * Profile 서비스
 *
 * @foryourdev/nestjs-crud의 CrudService를 상속받아
 * 자동 CRUD 기능을 제공합니다.
 */
@Injectable()
export class ProfileService extends CrudService<Profile> {
  constructor(
    @InjectRepository(Profile)
    repository: Repository<Profile>,
  ) {
    super(repository);
  }

  // 커스텀 함수는 최대한 지양하고, 필요시에만 추가
  // 대부분의 비즈니스 로직은 컨트롤러의 lifecycle hooks에서 처리

  /**
   * 사용자 ID로 프로필 조회
   * (nestjs-crud의 표준 기능으로도 가능하지만, 편의를 위해 제공)
   */
  async findByUserId(userId: number): Promise<Profile | null> {
    return this.findOne({ where: { userId } });
  }
}
