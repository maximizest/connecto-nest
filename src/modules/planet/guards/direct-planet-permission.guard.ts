import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanetUser } from '../../planet-user/planet-user.entity';
import { Planet } from '../planet.entity';
import { DirectPlanetPermissionUtil } from '../utils/direct-planet-permission.util';

/**
 * 1:1 Planet 권한 타입
 */
export type DirectPlanetPermission = 'read' | 'write' | 'upload';

/**
 * 1:1 Planet 권한 체크 데코레이터에서 사용할 메타데이터 키
 */
export const DIRECT_PLANET_PERMISSION_KEY = 'directPlanetPermission';

/**
 * 1:1 Planet 권한 체크 데코레이터
 */
export const RequireDirectPlanetPermission = (
  permission: DirectPlanetPermission,
) => SetMetadata(DIRECT_PLANET_PERMISSION_KEY, permission);

/**
 * 1:1 Planet 권한 체크 Guard
 * Planet 소속 유저만 접근할 수 있도록 제한
 */
@Injectable()
export class DirectPlanetPermissionGuard implements CanActivate {
  private permissionUtil: DirectPlanetPermissionUtil;

  constructor(
    private reflector: Reflector,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(PlanetUser)
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {
    this.permissionUtil = new DirectPlanetPermissionUtil(
      this.planetRepository,
      this.planetUserRepository,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 권한 타입 확인
    const permission = this.reflector.get<DirectPlanetPermission>(
      DIRECT_PLANET_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!permission) {
      return true; // 권한이 지정되지 않은 경우 통과
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const planetId = this.extractPlanetId(request);

    if (!user?.id) {
      throw new ForbiddenException('사용자 인증이 필요합니다.');
    }

    if (!planetId) {
      throw new BadRequestException('Planet ID가 필요합니다.');
    }

    // 권한 타입에 따른 체크
    const hasPermission = await this.checkPermission(
      permission,
      planetId,
      user.id,
    );

    if (!hasPermission) {
      throw new ForbiddenException('1:1 Planet에 접근할 권한이 없습니다.');
    }

    return true;
  }

  /**
   * 요청에서 Planet ID 추출
   */
  private extractPlanetId(request: any): number | null {
    // URL 파라미터에서 planetId 추출
    const planetId = request.params?.planetId || request.params?.id;

    // body에서 planetId 추출 (생성 요청의 경우)
    const bodyPlanetId = request.body?.planetId;

    // query에서 planetId 추출
    const queryPlanetId = request.query?.planetId;

    const id = planetId || bodyPlanetId || queryPlanetId;
    return id ? parseInt(id, 10) : null;
  }

  /**
   * 권한 타입에 따른 권한 체크
   */
  private async checkPermission(
    permission: DirectPlanetPermission,
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    switch (permission) {
      case 'read':
        return this.permissionUtil.canUserReadDirectPlanet(planetId, userId);

      case 'write':
        return this.permissionUtil.canUserWriteDirectPlanet(planetId, userId);

      case 'upload':
        return this.permissionUtil.canUserUploadFileDirectPlanet(
          planetId,
          userId,
        );

      default:
        return false;
    }
  }
}
