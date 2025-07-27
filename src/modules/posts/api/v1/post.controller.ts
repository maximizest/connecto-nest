import { Controller } from '@nestjs/common';
import { Crud } from '@foryourdev/nestjs-crud';
import { Post } from '../../post.entity';
import { PostService } from '../../post.service';

@Crud({
  entity: Post,
  allowedFilters: ['title', 'userId'],
  allowedParams: ['title', 'content', 'userId'],
  allowedIncludes: ['user'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
@Controller({
  path: 'posts',
  version: '1',
})
export class PostController {
  constructor(public readonly crudService: PostService) { }
}
