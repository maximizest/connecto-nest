import {
  AfterCreate,
  BeforeCreate,
  BeforeDestroy,
  BeforeShow,
  BeforeUpdate,
  Crud,
} from '@foryourdev/nestjs-crud';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../../user/user.entity';
import { PushToken, PushTokenPlatform } from '../../push-token.entity';
import { PushTokenService } from '../../push-token.service';

/**
 * Push Token API Controller (v1)
 *
 * FCM/APNS 푸시 토큰 관리를 위한 RESTful API
 * @foryourdev/nestjs-crud 패턴 활용
 *
 * 주요 기능:
 * - 푸시 토큰 등록 (POST /push-tokens)
 * - 푸시 토큰 조회 (GET /push-tokens)
 * - 푸시 토큰 업데이트 (PATCH /push-tokens/:id)
 * - 푸시 토큰 삭제 (DELETE /push-tokens/:id)
 */
@Controller({ path: 'push-tokens', version: '1' })
@Crud({
  entity: PushToken,

  // 허용할 CRUD 액션
  only: ['index', 'show', 'create', 'update', 'destroy'],

  // 필터링 허용 필드
  allowedFilters: [
    'platform',
    'deviceId',
    'isTokenActive',
    'appVersion',
    'createdAt',
  ],

  // Body에서 허용할 파라미터
  allowedParams: [
    'token',
    'platform',
    'deviceId',
    'appVersion',
    'deviceModel',
    'osVersion',
    'isTokenActive',
  ],

  // 관계 포함 허용
  allowedIncludes: ['user'],

  // 라우트별 설정
  routes: {
    index: {
      // 사용자는 자신의 토큰만 조회 가능
      allowedFilters: ['platform', 'isTokenActive', 'deviceId'],
    },
    show: {
      allowedIncludes: ['user'],
    },
  },
})
@UseGuards(AuthGuard)
export class PushTokenController {
  private readonly logger = new Logger(PushTokenController.name);

  constructor(public readonly crudService: PushTokenService) {}

  /**
   * 푸시 토큰 생성 전 처리
   * - userId 자동 설정
   * - Upsert 로직 처리 (deviceId 기준)
   */
  @BeforeCreate()
  async beforeCreate(body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    // 필수 필드 검증
    if (!body.token || !body.platform || !body.deviceId) {
      throw new BadRequestException('토큰, 플랫폼, 디바이스 ID는 필수입니다.');
    }

    // 플랫폼 검증
    if (!Object.values(PushTokenPlatform).includes(body.platform)) {
      throw new BadRequestException('유효하지 않은 플랫폼입니다.');
    }

    // 사용자 ID 설정
    body.userId = user.id;

    // 기존 토큰 확인 (upsert 로직)
    const existingToken = await PushToken.findByDeviceId(
      user.id,
      body.deviceId,
    );

    if (existingToken) {
      // 기존 토큰 업데이트
      existingToken.token = body.token;
      existingToken.platform = body.platform;
      existingToken.appVersion = body.appVersion;
      existingToken.deviceModel = body.deviceModel;
      existingToken.osVersion = body.osVersion;
      existingToken.isTokenActive = true;
      existingToken.failureCount = 0;
      existingToken.lastFailureAt = undefined;

      const updated = await existingToken.save();

      // 생성 대신 업데이트된 엔티티 반환
      context.skipCreate = true;
      context.existingEntity = updated;
      context.isUpdate = true;

      this.logger.log(
        `Push token updated: userId=${user.id}, deviceId=${body.deviceId}, platform=${body.platform}`,
      );

      return null;
    }

    // 새 토큰 생성
    body.isTokenActive = true;
    body.failureCount = 0;

    this.logger.log(
      `Creating new push token: userId=${user.id}, deviceId=${body.deviceId}, platform=${body.platform}`,
    );

    return body;
  }

  /**
   * 푸시 토큰 생성 후 처리
   */
  @AfterCreate()
  async afterCreate(entity: PushToken | null, context: any): Promise<void> {
    if (context.skipCreate && context.existingEntity) {
      // 업데이트된 경우
      entity = context.existingEntity;
    }

    if (!entity) return;

    this.logger.log(
      `Push token ${context.isUpdate ? 'updated' : 'created'}: id=${entity.id}, userId=${entity.userId}, deviceId=${entity.deviceId}`,
    );
  }

  /**
   * 푸시 토큰 조회 전 처리
   * - 사용자는 자신의 토큰만 조회 가능
   */
  @BeforeShow()
  async beforeShow(entity: PushToken, context: any): Promise<PushToken> {
    const user: User = context.request?.user;

    if (entity.userId !== user.id) {
      throw new ForbiddenException('이 푸시 토큰을 조회할 권한이 없습니다.');
    }

    return entity;
  }

  /**
   * 푸시 토큰 수정 전 처리
   * - 본인 토큰만 수정 가능
   * - userId는 변경 불가
   */
  @BeforeUpdate()
  async beforeUpdate(entity: PushToken, body: any, context: any): Promise<any> {
    const user: User = context.request?.user;

    if (entity.userId !== user.id) {
      throw new ForbiddenException('이 푸시 토큰을 수정할 권한이 없습니다.');
    }

    // userId 변경 방지
    delete body.userId;

    // 플랫폼 검증
    if (
      body.platform &&
      !Object.values(PushTokenPlatform).includes(body.platform)
    ) {
      throw new BadRequestException('유효하지 않은 플랫폼입니다.');
    }

    this.logger.log(
      `Updating push token: id=${entity.id}, userId=${user.id}, deviceId=${entity.deviceId}`,
    );

    return body;
  }

  /**
   * 푸시 토큰 삭제 전 처리
   * - 본인 토큰만 삭제 가능
   * - 실제 삭제 대신 비활성화 처리 옵션
   */
  @BeforeDestroy()
  async beforeDestroy(entity: PushToken, context: any): Promise<void> {
    const user: User = context.request?.user;

    if (entity.userId !== user.id) {
      throw new ForbiddenException('이 푸시 토큰을 삭제할 권한이 없습니다.');
    }

    // 소프트 삭제 옵션 (비활성화만 처리)
    if (context.request?.query?.soft === 'true') {
      entity.isTokenActive = false;
      await entity.save();

      // 실제 삭제 방지
      context.skipDestroy = true;

      this.logger.log(
        `Push token deactivated (soft delete): id=${entity.id}, userId=${user.id}, deviceId=${entity.deviceId}`,
      );
    } else {
      this.logger.log(
        `Deleting push token: id=${entity.id}, userId=${user.id}, deviceId=${entity.deviceId}`,
      );
    }
  }
}
