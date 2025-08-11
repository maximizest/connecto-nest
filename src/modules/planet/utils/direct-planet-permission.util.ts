import { Repository } from 'typeorm';
import {
  PlanetUser,
  PlanetUserStatus,
} from '../../planet-user/planet-user.entity';
import { Planet, PlanetType } from '../planet.entity';

/**
 * 1:1 Planet 권한 체크 유틸리티
 * Planet 소속 유저만 접근할 수 있도록 하는 권한 로직
 */
export class DirectPlanetPermissionUtil {
  constructor(
    private readonly planetRepository: Repository<Planet>,
    private readonly planetUserRepository: Repository<PlanetUser>,
  ) {}

  /**
   * 사용자가 1:1 Planet에 접근할 수 있는지 확인
   * @param planetId Planet ID
   * @param userId 사용자 ID
   * @returns 접근 가능 여부
   */
  async canUserAccessDirectPlanet(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    // Planet 조회
    const planet = await this.planetRepository.findOne({
      where: { id: planetId, isActive: true },
    });

    if (!planet || !planet.isDirectPlanet()) {
      return false;
    }

    // 기본 참여자 체크 (createdBy 또는 partnerId)
    if (planet.isDirectPlanetParticipant(userId)) {
      return true;
    }

    // PlanetUser 관계로 추가 체크
    const planetUser = await this.planetUserRepository.findOne({
      where: {
        planetId,
        userId,
        status: PlanetUserStatus.ACTIVE,
      },
    });

    return planetUser?.hasDirectPlanetReadPermission() ?? false;
  }

  /**
   * 사용자가 1:1 Planet에서 메시지를 읽을 수 있는지 확인
   */
  async canUserReadDirectPlanet(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser) {
      return false;
    }

    const planet = await this.getDirectPlanet(planetId);
    if (!planet || !planet.isDirectPlanet()) {
      return false;
    }

    return planetUser.hasDirectPlanetReadPermission();
  }

  /**
   * 사용자가 1:1 Planet에서 메시지를 쓸 수 있는지 확인
   */
  async canUserWriteDirectPlanet(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser) {
      return false;
    }

    const planet = await this.getDirectPlanet(planetId);
    if (!planet || !planet.isDirectPlanet()) {
      return false;
    }

    return planetUser.hasDirectPlanetWritePermission();
  }

  /**
   * 사용자가 1:1 Planet에서 파일을 업로드할 수 있는지 확인
   */
  async canUserUploadFileDirectPlanet(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser) {
      return false;
    }

    const planet = await this.getDirectPlanet(planetId);
    if (!planet || !planet.isDirectPlanet()) {
      return false;
    }

    return planetUser.hasDirectPlanetFileUploadPermission();
  }

  /**
   * 1:1 Planet의 상대방 정보 조회
   */
  async getDirectPlanetPartner(
    planetId: number,
    userId: number,
  ): Promise<{ partnerId: number; partnerUser?: PlanetUser } | null> {
    const planet = await this.getDirectPlanet(planetId);
    if (!planet) {
      return null;
    }

    const partnerId = planet.getDirectPlanetPartner(userId);
    if (!partnerId) {
      return null;
    }

    const partnerUser = await this.getPlanetUser(planetId, partnerId);
    return {
      partnerId,
      partnerUser: partnerUser || undefined,
    };
  }

  /**
   * 1:1 Planet 초대 처리
   */
  async inviteUserToDirectPlanet(
    planetId: number,
    inviterId: number,
    inviteeId: number,
  ): Promise<PlanetUser | null> {
    // 초대자가 권한이 있는지 확인
    const canInvite = await this.canUserWriteDirectPlanet(planetId, inviterId);
    if (!canInvite) {
      return null;
    }

    // 기존 초대 확인
    const existingPlanetUser = await this.getPlanetUser(planetId, inviteeId);
    if (existingPlanetUser) {
      return null; // 이미 참여중이거나 초대받은 상태
    }

    // 새 초대 생성
    const planetUser = this.planetUserRepository.create({
      planetId,
      userId: inviteeId,
      status: PlanetUserStatus.INVITED,
      invitedBy: inviterId,
      invitedAt: new Date(),
    });

    return this.planetUserRepository.save(planetUser);
  }

  /**
   * 1:1 Planet 초대 수락 처리
   */
  async acceptDirectPlanetInvite(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser || !planetUser.canAcceptDirectPlanetInvite()) {
      return false;
    }

    planetUser.acceptDirectPlanetInvite();
    await this.planetUserRepository.save(planetUser);
    return true;
  }

  /**
   * 1:1 Planet 초대 거절 처리
   */
  async rejectDirectPlanetInvite(
    planetId: number,
    userId: number,
  ): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser || !planetUser.isInvitedToDirectPlanet()) {
      return false;
    }

    planetUser.rejectDirectPlanetInvite();
    await this.planetUserRepository.save(planetUser);
    return true;
  }

  /**
   * 1:1 Planet 탈퇴 처리
   */
  async leaveDirectPlanet(planetId: number, userId: number): Promise<boolean> {
    const planetUser = await this.getPlanetUser(planetId, userId);
    if (!planetUser || !planetUser.canChatInDirectPlanet()) {
      return false;
    }

    planetUser.leaveDirectPlanet();
    await this.planetUserRepository.save(planetUser);
    return true;
  }

  /**
   * 1:1 Planet 멤버 목록 조회 (2명만)
   */
  async getDirectPlanetMembers(planetId: number): Promise<PlanetUser[]> {
    return this.planetUserRepository.find({
      where: {
        planetId,
        status: PlanetUserStatus.ACTIVE,
      },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * 헬퍼 메서드들
   */
  private async getDirectPlanet(planetId: number): Promise<Planet | null> {
    return this.planetRepository.findOne({
      where: {
        id: planetId,
        type: PlanetType.DIRECT,
        isActive: true,
      },
    });
  }

  private async getPlanetUser(
    planetId: number,
    userId: number,
  ): Promise<PlanetUser | null> {
    return this.planetUserRepository.findOne({
      where: { planetId, userId },
      relations: ['user', 'planet'],
    });
  }
}
