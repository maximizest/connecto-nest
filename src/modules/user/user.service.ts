import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
