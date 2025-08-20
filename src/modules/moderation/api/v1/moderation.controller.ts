import {
  Body,
  Controller,
  ForbiddenException,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { validateBanPermission } from '../../../../common/helpers/role-based-permission.helper';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet } from '../../../planet/planet.entity';
import { Travel } from '../../../travel/travel.entity';
import { TravelUser } from '../../../travel-user/travel-user.entity';
import { TravelUserStatus } from '../../../travel-user/enums/travel-user-status.enum';
import { User } from '../../../user/user.entity';
import { UserRole } from '../../../user/enums/user-role.enum';

/**
 * Moderation API Controller (v1)
 *
 * 역할 기반 사용자 벤/언벤 관리를 위한 REST API
 *
 * 권한 규칙:
 * - ADMIN: 플랫폼 전체, 모든 Travel, 모든 Planet에서 벤 가능
 * - HOST: 참여한 Travel 및 해당 Travel의 Planet에서만 벤 가능
 * - USER: 벤 권한 없음
 */
@Controller({ path: 'moderation', version: '1' })
@UseGuards(AuthGuard)
export class ModerationController {
  private readonly logger = new Logger(ModerationController.name);

  constructor() {}

  /**
   * 플랫폼 전체 사용자 벤 (ADMIN만 가능)
   * POST /api/v1/moderation/ban/platform/:userId
   */
  @Post('ban/platform/:userId')
  async banUserFromPlatform(
    @Param('userId') targetUserId: number,
    @Body() body: { reason?: string },
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const bannerUser = currentUser as User;

    try {
      // 벤 권한 확인
      const permission = await validateBanPermission(
        bannerUser.id,
        targetUserId,
        'platform',
      );

      if (!permission.canBan) {
        throw new ForbiddenException(permission.reason);
      }

      // 대상 사용자 조회
      const targetUser = await User.findOne({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new NotFoundException('대상 사용자를 찾을 수 없습니다.');
      }

      if (targetUser.isBanned) {
        throw new ForbiddenException('이미 정지된 사용자입니다.');
      }

      // 플랫폼 벤 실행
      targetUser.banUser();
      await targetUser.save();

      this.logger.log(
        `Platform ban: targetUserId=${targetUserId}, bannedBy=${bannerUser.id}, reason=${body.reason}`,
      );

      return {
        success: true,
        message: '사용자가 플랫폼에서 정지되었습니다.',
        data: {
          targetUserId,
          bannedBy: bannerUser.id,
          bannerRole: bannerUser.role,
          reason: body.reason,
          bannedAt: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Platform ban failed: targetUserId=${targetUserId}, bannedBy=${bannerUser.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * 플랫폼 전체 사용자 벤 해제 (ADMIN만 가능)
   * POST /api/v1/moderation/unban/platform/:userId
   */
  @Post('unban/platform/:userId')
  async unbanUserFromPlatform(
    @Param('userId') targetUserId: number,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const bannerUser = currentUser as User;

    try {
      // ADMIN 권한 확인
      if (bannerUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('관리자만 플랫폼 벤 해제가 가능합니다.');
      }

      // 대상 사용자 조회
      const targetUser = await User.findOne({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new NotFoundException('대상 사용자를 찾을 수 없습니다.');
      }

      if (!targetUser.isBanned) {
        throw new ForbiddenException('정지되지 않은 사용자입니다.');
      }

      // 플랫폼 벤 해제
      targetUser.unbanUser();
      await targetUser.save();

      this.logger.log(
        `Platform unban: targetUserId=${targetUserId}, unbannedBy=${bannerUser.id}`,
      );

      return {
        success: true,
        message: '사용자의 플랫폼 정지가 해제되었습니다.',
        data: {
          targetUserId,
          unbannedBy: bannerUser.id,
          unbannedAt: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Platform unban failed: targetUserId=${targetUserId}, unbannedBy=${bannerUser.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * Travel에서 사용자 벤 (ADMIN/HOST 가능)
   * POST /api/v1/moderation/ban/travel/:travelId/:userId
   */
  @Post('ban/travel/:travelId/:userId')
  async banUserFromTravel(
    @Param('travelId') travelId: number,
    @Param('userId') targetUserId: number,
    @Body() body: { reason?: string },
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const bannerUser = currentUser as User;

    try {
      // 벤 권한 확인
      const permission = await validateBanPermission(
        bannerUser.id,
        targetUserId,
        'travel',
        travelId,
      );

      if (!permission.canBan) {
        throw new ForbiddenException(permission.reason);
      }

      // Travel 조회
      const travel = await Travel.findOne({
        where: { id: travelId },
      });

      if (!travel) {
        throw new NotFoundException('Travel을 찾을 수 없습니다.');
      }

      // 대상 사용자의 TravelUser 조회
      const targetTravelUser = await TravelUser.findOne({
        where: { userId: targetUserId, travelId },
      });

      if (!targetTravelUser) {
        throw new NotFoundException(
          '해당 Travel에 참여하지 않은 사용자입니다.',
        );
      }

      if (targetTravelUser.status === TravelUserStatus.BANNED) {
        throw new ForbiddenException('이미 Travel에서 정지된 사용자입니다.');
      }

      // Travel 벤 실행
      targetTravelUser.banUser(body.reason);
      await targetTravelUser.save();

      this.logger.log(
        `Travel ban: travelId=${travelId}, targetUserId=${targetUserId}, bannedBy=${bannerUser.id}, reason=${body.reason}`,
      );

      return {
        success: true,
        message: '사용자가 Travel에서 정지되었습니다.',
        data: {
          travelId,
          targetUserId,
          bannedBy: bannerUser.id,
          bannerRole: bannerUser.role,
          reason: body.reason,
          bannedAt: targetTravelUser.bannedAt,
        },
      };
    } catch (_error) {
      this.logger.error(
        `Travel ban failed: travelId=${travelId}, targetUserId=${targetUserId}, bannedBy=${bannerUser.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }

  /**
   * Travel에서 사용자 벤 해제 (ADMIN/HOST 가능)
   * POST /api/v1/moderation/unban/travel/:travelId/:userId
   */
  @Post('unban/travel/:travelId/:userId')
  async unbanUserFromTravel(
    @Param('travelId') travelId: number,
    @Param('userId') targetUserId: number,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const bannerUser = currentUser as User;

    try {
      // 벤 해제 권한 확인 (벤과 동일한 권한)
      const permission = await validateBanPermission(
        bannerUser.id,
        targetUserId,
        'travel',
        travelId,
      );

      if (!permission.canBan) {
        throw new ForbiddenException(permission.reason);
      }

      // Travel 조회
      const travel = await Travel.findOne({
        where: { id: travelId },
      });

      if (!travel) {
        throw new NotFoundException('Travel을 찾을 수 없습니다.');
      }

      // 대상 사용자의 TravelUser 조회
      const targetTravelUser = await TravelUser.findOne({
        where: { userId: targetUserId, travelId },
      });

      if (!targetTravelUser) {
        throw new NotFoundException(
          '해당 Travel에 참여하지 않은 사용자입니다.',
        );
      }

      if (targetTravelUser.status !== TravelUserStatus.BANNED) {
        throw new ForbiddenException('Travel에서 정지되지 않은 사용자입니다.');
      }

      // Travel 벤 해제
      targetTravelUser.unbanUser();
      await targetTravelUser.save();

      this.logger.log(
        `Travel unban: travelId=${travelId}, targetUserId=${targetUserId}, unbannedBy=${bannerUser.id}`,
      );

      return {
        success: true,
        message: '사용자의 Travel 정지가 해제되었습니다.',
        data: {
          travelId,
          targetUserId,
          unbannedBy: bannerUser.id,
          unbannedAt: new Date(),
        },
      };
    } catch (_error) {
      this.logger.error(
        `Travel unban failed: travelId=${travelId}, targetUserId=${targetUserId}, unbannedBy=${bannerUser.id}, error=${_error.message}`,
      );
      throw _error;
    }
  }
}
