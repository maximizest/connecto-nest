import { Crud } from '@foryourdev/nestjs-crud';
import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Accommodation } from '../../accommodation.entity';
import { AccommodationService } from '../../accommodation.service';

/**
 * Accommodation API Controller (v1)
 *
 * 숙박 업소 조회 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 */
@Controller({ path: 'accommodations', version: '1' })
@Crud({
  entity: Accommodation,
  only: ['index', 'show'], // index와 show만 허용
  allowedFilters: ['name', 'createdAt'],
  allowedIncludes: ['travels'],
  routes: {
    index: {
      allowedIncludes: ['travels'],
    },
    show: {
      allowedIncludes: ['travels'],
    },
  },
})
@UseGuards(AuthGuard)
export class AccommodationController {
  constructor(public readonly crudService: AccommodationService) {}
}
