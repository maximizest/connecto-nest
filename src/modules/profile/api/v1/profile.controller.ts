import {
  BeforeUpdate,
  BeforeShow,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Profile } from '../../profile.entity';
import { ProfileService } from '../../profile.service';
import { User } from '../../../user/user.entity';
import { CurrentUserData } from '../../../../common/decorators/current-user.decorator';

/**
 * Profile API 컨트롤러 (v1)
 *
 * 사용자 프로필 관리 API
 * @foryourdev/nestjs-crud를 활용하여 표준 RESTful API를 제공합니다.
 *
 * 권한 규칙:
 * - 모든 작업에 인증 필요 (AuthGuard)
 * - 본인의 프로필만 생성/수정 가능
 * - 프로필 조회는 제한 없음 (공개 프로필)
 */
@Controller({ path: 'profiles', version: '1' })
@Crud({
  entity: Profile,
  only: ['index', 'show', 'update'], // create route removed
  allowedFilters: [
    'userId',
    'nickname',
    'name',
    'gender',
    'age',
    'occupation',
    'createdAt',
  ],
  allowedParams: ['nickname', 'name', 'gender', 'age', 'occupation'],
  allowedIncludes: ['user'],
  routes: {
    index: {
      allowedFilters: ['userId', 'gender', 'age', 'occupation', 'createdAt'],
      allowedIncludes: ['user'],
    },
    show: {
      allowedIncludes: ['user'],
    },
    update: {
      allowedParams: ['nickname', 'name', 'gender', 'age', 'occupation'],
    },
  },
})
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(public readonly crudService: ProfileService) {}


  /**
   * 프로필 수정 전 권한 확인
   */
  @BeforeUpdate()
  async beforeUpdate(entity: Profile, context: any): Promise<Profile> {
    const currentUser: CurrentUserData = context.request?.user;

    // 본인의 프로필만 수정 가능
    if (entity.userId !== currentUser.id) {
      throw new ForbiddenException('본인의 프로필만 수정할 수 있습니다.');
    }

    // 사용자가 차단된 경우 수정 불가
    const user = await User.findOne({
      where: { id: currentUser.id },
    });

    if (user?.isBanned) {
      throw new ForbiddenException(
        '차단된 계정은 프로필을 수정할 수 없습니다.',
      );
    }

    return entity;
  }

  /**
   * 프로필 조회 전 처리
   */
  @BeforeShow()
  async beforeShow(params: any, context: any): Promise<any> {
    const profileId = parseInt(params.id, 10);

    // 프로필 존재 여부 확인
    const profile = await Profile.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다.');
    }

    // 차단된 사용자의 프로필 조회 제한 (옵션)
    const user = await User.findOne({
      where: { id: profile.userId },
    });

    if (user?.isBanned) {
      // 관리자가 아닌 경우 차단된 사용자 프로필 조회 제한
      const currentUser: CurrentUserData = context.request?.user;
      if (currentUser.id !== profile.userId) {
        throw new ForbiddenException('차단된 사용자의 프로필입니다.');
      }
    }

    return params;
  }
}
