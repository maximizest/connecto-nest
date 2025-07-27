import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '@foryourdev/nestjs-crud';
import { Post } from './post.entity';

@Injectable()
export class PostService extends CrudService<Post> {
  constructor(
    @InjectRepository(Post)
    public readonly repository: Repository<Post>,
  ) {
    super(repository);
  }
} 