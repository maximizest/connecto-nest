import { BeforeCreate, BeforeUpdate, Crud } from '@foryourdev/nestjs-crud';
import { Controller } from '@nestjs/common';
import { Profile } from '../../profile.entity';
import { ProfileService } from '../../profile.service';

/**
 * Profile API 컨트롤러 (v1)
 *
 * @foryourdev/nestjs-crud를 사용하여 자동 CRUD API 생성
 * 사용자용 API만 제공 (관리자 기능 제외)
 */
@Controller({ path: 'profiles', version: '1' })
@Crud({
  entity: Profile,
  // 🔒 보안 설정 - 허용하지 않은 필드는 자동 차단
  allowedFilters: [
    'nickname',
    'name',
    'gender',
    'age',
    'occupation',
    'user.id',
  ],
  allowedParams: [
    'nickname',
    'name',
    'gender',
    'age',
    'occupation',
    'bio',
    'profileImageUrl',
    'settings',
  ],
  allowedIncludes: [
    'user', // User 정보 포함 가능
  ],
  // 사용자용 API이므로 기본 CRUD 액션만 허용
  only: ['index', 'show', 'create', 'update'],
  // 라우트별 개별 설정
  routes: {
    index: {
      allowedFilters: ['nickname', 'gender', 'age', 'occupation'],
      allowedIncludes: [], // 목록에서는 User 정보 제외
    },
    show: {
      allowedIncludes: ['user'], // 상세 조회에서만 User 정보 포함 가능
    },
    create: {
      allowedParams: [
        'nickname',
        'name',
        'gender',
        'age',
        'occupation',
        'bio',
        'profileImageUrl',
        'settings',
      ],
    },
    update: {
      allowedParams: [
        'nickname',
        'name',
        'gender',
        'age',
        'occupation',
        'bio',
        'profileImageUrl',
        'settings',
      ],
    },
  },
})
export class ProfileController {
  constructor(public readonly crudService: ProfileService) {}

  /**
   * 프로필 생성 전 사용자 ID 설정 (나머지는 Profile 엔티티에서 자동 처리)
   */
  @BeforeCreate()
  async preprocessCreate(body: any, context: any) {
    // 현재 인증된 사용자 ID를 자동 설정
    const userId = context.request?.user?.id;
    if (userId) {
      body.userId = userId;
    }

    // 기본값 설정, 닉네임/나이 검증은 Profile 엔티티에서 자동 처리됨
    return body;
  }

  /**
   * 프로필 수정 전 설정 값 병합 (나머지는 Profile 엔티티에서 자동 처리)
   */
  @BeforeUpdate()
  async preprocessUpdate(entity: Profile, context: any) {
    // 설정 값 병합 (기존 설정 유지) - 엔티티에서 처리하기 어려운 로직
    if (entity.settings && context.currentEntity?.settings) {
      entity.settings = {
        ...context.currentEntity.settings,
        ...entity.settings,
      };
    }

    // 닉네임/나이 검증은 Profile 엔티티에서 자동 처리됨
    return entity;
  }
}
