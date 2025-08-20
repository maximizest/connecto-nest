import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Profile } from './profile.entity';

/**
 * Profile Service - Basic CrudService Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: Profile.findByUserId(id), Profile.createProfile(data), Profile.findByAgeRange(min, max)
 */
@Injectable()
export class ProfileService extends CrudService<Profile> {
  constructor(
    @InjectRepository(Profile)
    repository: Repository<Profile>,
  ) {
    super(repository);
  }
}
