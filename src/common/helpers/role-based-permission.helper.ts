import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Planet } from '../../modules/planet/planet.entity';
import { PlanetType } from '../../modules/planet/enums/planet-type.enum';
import { PlanetUser } from '../../modules/planet-user/planet-user.entity';
import { PlanetUserStatus } from '../../modules/planet-user/enums/planet-user-status.enum';
import { TravelUser } from '../../modules/travel-user/travel-user.entity';
import { TravelUserStatus } from '../../modules/travel-user/enums/travel-user-status.enum';
import { User } from '../../modules/user/user.entity';
import { UserRole } from '../../modules/user/enums/user-role.enum';

/**
 * 역할 기반 권한 헬퍼
 *
 * 사용자 역할에 따른 Planet/Travel 접근 권한을 검증합니다.
 *
 * 권한 규칙:
 * - ADMIN: 모든 Planet 접근 가능, 모든 사용자 벤 가능
 * - HOST: 참여한 Travel의 모든 Planet 접근 가능, 해당 Travel/Planet 사용자 벤 가능
 * - USER: 참여한 Planet만 접근 가능, 벤 권한 없음
 */

/**
 * Planet 접근 권한 검증 (역할 기반)
 */
export async function validateRoleBasedPlanetAccess(
  planetId: number,
  userId: number,
): Promise<Planet> {
  const user = await User.findOne({
    where: { id: userId },
    select: ['id', 'role', 'isBanned'],
  });

  if (!user) {
    throw new NotFoundException('사용자를 찾을 수 없습니다.');
  }

  if (user.isBanned) {
    throw new ForbiddenException('정지된 사용자는 접근할 수 없습니다.');
  }

  const planet = await Planet.findOne({
    where: { id: planetId },
    relations: ['travel'],
  });

  if (!planet) {
    throw new NotFoundException('Planet을 찾을 수 없습니다.');
  }

  // ADMIN: 모든 Planet 접근 가능
  if (user.role === UserRole.ADMIN) {
    return planet;
  }

  // Travel 만료 확인
  if (planet.travel.isExpired()) {
    throw new ForbiddenException('만료된 Travel의 Planet입니다.');
  }

  // HOST: 참여한 Travel의 모든 Planet 접근 가능
  if (user.role === UserRole.HOST) {
    const travelUser = await TravelUser.findOne({
      where: {
        userId,
        travelId: planet.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (travelUser) {
      return planet; // HOST는 참여한 Travel의 모든 Planet 접근 가능
    }
  }

  // USER 및 HOST가 참여하지 않은 Travel의 경우: 기존 멤버십 확인
  if (planet.type === PlanetType.GROUP) {
    const travelUser = await TravelUser.findOne({
      where: {
        userId,
        travelId: planet.travelId,
        status: TravelUserStatus.ACTIVE,
      },
    });

    if (!travelUser) {
      throw new ForbiddenException('Travel 멤버만 접근할 수 있습니다.');
    }
  } else if (planet.type === PlanetType.DIRECT) {
    const planetUser = await PlanetUser.findOne({
      where: { userId, planetId: planet.id, status: PlanetUserStatus.ACTIVE },
    });

    if (!planetUser) {
      throw new ForbiddenException('1:1 Planet 접근 권한이 없습니다.');
    }
  }

  return planet;
}

/**
 * 사용자 벤 권한 검증
 */
export async function validateBanPermission(
  bannerUserId: number,
  targetUserId: number,
  context: 'platform' | 'travel' | 'planet',
  contextId?: number,
): Promise<{ canBan: boolean; reason?: string }> {
  const bannerUser = await User.findOne({
    where: { id: bannerUserId },
    select: ['id', 'role', 'isBanned'],
  });

  if (!bannerUser || bannerUser.isBanned) {
    return { canBan: false, reason: '권한이 없습니다.' };
  }

  const targetUser = await User.findOne({
    where: { id: targetUserId },
    select: ['id', 'role'],
  });

  if (!targetUser) {
    return { canBan: false, reason: '대상 사용자를 찾을 수 없습니다.' };
  }

  // 자기 자신은 벤할 수 없음
  if (bannerUserId === targetUserId) {
    return { canBan: false, reason: '자기 자신을 벤할 수 없습니다.' };
  }

  // ADMIN은 다른 ADMIN을 벤할 수 없음
  if (
    targetUser.role === UserRole.ADMIN &&
    bannerUser.role === UserRole.ADMIN
  ) {
    return { canBan: false, reason: '다른 관리자를 벤할 수 없습니다.' };
  }

  switch (context) {
    case 'platform':
      // 플랫폼 전체 벤: ADMIN만 가능
      if (bannerUser.role === UserRole.ADMIN) {
        return { canBan: true };
      }
      return { canBan: false, reason: '관리자만 플랫폼 벤이 가능합니다.' };

    case 'travel':
      if (!contextId) {
        return { canBan: false, reason: 'Travel ID가 필요합니다.' };
      }

      // ADMIN: 모든 Travel에서 벤 가능
      if (bannerUser.role === UserRole.ADMIN) {
        return { canBan: true };
      }

      // HOST: 참여한 Travel에서만 벤 가능
      if (bannerUser.role === UserRole.HOST) {
        const bannerTravelUser = await TravelUser.findOne({
          where: {
            userId: bannerUserId,
            travelId: contextId,
            status: TravelUserStatus.ACTIVE,
          },
        });

        if (bannerTravelUser) {
          return { canBan: true };
        }
      }

      return { canBan: false, reason: 'Travel 벤 권한이 없습니다.' };

    case 'planet':
      if (!contextId) {
        return { canBan: false, reason: 'Planet ID가 필요합니다.' };
      }

      const planet = await Planet.findOne({
        where: { id: contextId },
        relations: ['travel'],
      });

      if (!planet) {
        return { canBan: false, reason: 'Planet을 찾을 수 없습니다.' };
      }

      // ADMIN: 모든 Planet에서 벤 가능
      if (bannerUser.role === UserRole.ADMIN) {
        return { canBan: true };
      }

      // HOST: 참여한 Travel의 Planet에서만 벤 가능
      if (bannerUser.role === UserRole.HOST) {
        const bannerTravelUser = await TravelUser.findOne({
          where: {
            userId: bannerUserId,
            travelId: planet.travelId,
            status: TravelUserStatus.ACTIVE,
          },
        });

        if (bannerTravelUser) {
          return { canBan: true };
        }
      }

      return { canBan: false, reason: 'Planet 벤 권한이 없습니다.' };

    default:
      return { canBan: false, reason: '잘못된 컨텍스트입니다.' };
  }
}

/**
 * 채팅 메시지 전송 권한 검증
 */
export async function validateChatPermission(
  userId: number,
  planetId: number,
): Promise<{ canChat: boolean; reason?: string }> {
  try {
    await validateRoleBasedPlanetAccess(planetId, userId);

    // 추가: 사용자가 해당 Planet에서 벤되었는지 확인
    const user = await User.findOne({
      where: { id: userId },
      select: ['id', 'role', 'isBanned'],
    });

    if (user?.isBanned) {
      return { canChat: false, reason: '플랫폼에서 정지된 사용자입니다.' };
    }

    // Travel 레벨 벤 확인
    const planet = await Planet.findOne({
      where: { id: planetId },
      select: ['id', 'travelId'],
    });

    if (planet) {
      const travelUser = await TravelUser.findOne({
        where: {
          userId,
          travelId: planet.travelId,
        },
      });

      if (travelUser?.status === TravelUserStatus.BANNED) {
        return { canChat: false, reason: 'Travel에서 정지된 사용자입니다.' };
      }
    }

    return { canChat: true };
  } catch (_error: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return { canChat: false, reason: _error.message };
  }
}
