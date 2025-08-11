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
   * 프로필 생성 전 데이터 전처리
   */
  @BeforeCreate()
  async preprocessCreate(body: any, context: any) {
    // 현재 인증된 사용자 ID를 자동 설정
    const userId = context.request?.user?.id;
    if (userId) {
      body.userId = userId;
    }

    // 닉네임이 없으면 이름을 사용
    if (!body.nickname && body.name) {
      body.nickname = body.name;
    }

    // 기본 설정 값 설정
    if (!body.settings) {
      body.settings = {
        showAge: true,
        showGender: true,
        showOccupation: true,
        allowDirectMessage: true,
        language: 'ko',
        timezone: 'Asia/Seoul',
        theme: 'light',
      };
    }

    // 나이 유효성 검사
    if (body.age !== undefined) {
      const age = Number(body.age);
      if (isNaN(age) || age < 1 || age > 150) {
        throw new Error('나이는 1~150 사이의 숫자여야 합니다.');
      }
      body.age = age;
    }

    return body;
  }

  /**
   * 프로필 수정 전 데이터 전처리
   */
  @BeforeUpdate()
  async preprocessUpdate(entity: Profile, context: any) {
    // 닉네임이 비어있으면 이름을 사용
    if (entity.nickname === '' && entity.name) {
      entity.nickname = entity.name;
    }

    // 나이 유효성 검사
    if (entity.age !== undefined && entity.age !== null) {
      const age = Number(entity.age);
      if (isNaN(age) || age < 1 || age > 150) {
        throw new Error('나이는 1~150 사이의 숫자여야 합니다.');
      }
      entity.age = age;
    }

    // 설정 값 병합 (기존 설정 유지)
    if (entity.settings && context.currentEntity?.settings) {
      entity.settings = {
        ...context.currentEntity.settings,
        ...entity.settings,
      };
    }

    return entity;
  }
}
