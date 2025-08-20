import { Injectable } from '@nestjs/common';
import { CrudService } from '@foryourdev/nestjs-crud';
import { User } from './user.entity';

/**
 * User Service - Basic CrudService Pattern
 *
 * 기본 CRUD 기능은 CrudService를 통해 제공됩니다.
 * 커스텀 비즈니스 로직이 필요한 경우 Entity의 Active Record 메서드를 직접 사용하세요.
 * 예: User.findByEmail(email), User.createSocialUser(data), User.banUser(id, reason)
 */
@Injectable()
export class UserService extends CrudService<User> {
  constructor() {
    super(User.getRepository());
  }
}
