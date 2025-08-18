import {
  BeforeCreate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Controller,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Accommodation } from '../../accommodation.entity';
import { AccommodationService } from '../../accommodation.service';

/**
 * Accommodation API Controller (v1)
 * 
 * 숙박 업소 관리 기능을 제공합니다.
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 */
@Controller({ path: 'accommodations', version: '1' })
@Crud({
  entity: Accommodation,
  only: ['index', 'show', 'create', 'update', 'destroy'],
  allowedFilters: ['name', 'createdAt'],
  allowedParams: ['name', 'description'],
  allowedIncludes: ['travels'],
  routes: {
    index: {
      allowedIncludes: ['travels'],
    },
    show: {
      allowedIncludes: ['travels'],
    },
    create: {
      allowedParams: ['name', 'description'],
    },
    update: {
      allowedParams: ['name', 'description'],
    },
  },
})
@UseGuards(AuthGuard)
export class AccommodationController {
  constructor(public readonly crudService: AccommodationService) {}

  /**
   * 숙박 업소 생성 전 유효성 검사
   */
  @BeforeCreate()
  async beforeCreate(params: any, context: any): Promise<any> {
    // 필수 필드 검증
    if (!params.data.name || params.data.name.trim() === '') {
      throw new BadRequestException('숙소명은 필수입니다.');
    }

    // 숙소명 길이 검증
    if (params.data.name.length > 255) {
      throw new BadRequestException('숙소명은 255자 이하여야 합니다.');
    }

    return params;
  }

  /**
   * 숙박 업소 수정 전 유효성 검사
   */
  @BeforeUpdate()
  async beforeUpdate(params: any, context: any): Promise<any> {
    // 숙소명 검증 (제공된 경우)
    if (params.data.name !== undefined) {
      if (params.data.name.trim() === '') {
        throw new BadRequestException('숙소명은 비어있을 수 없습니다.');
      }
      if (params.data.name.length > 255) {
        throw new BadRequestException('숙소명은 255자 이하여야 합니다.');
      }
    }

    return params;
  }
}