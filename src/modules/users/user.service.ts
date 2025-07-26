import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { User } from './user.entity';

@Injectable()
export class UserService extends CrudService<User> {
  constructor(@InjectRepository(User) userRepository: Repository<User>) {
    super(userRepository);
  }
}
