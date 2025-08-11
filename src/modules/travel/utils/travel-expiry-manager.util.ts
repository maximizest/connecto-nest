import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RedisService } from '../../cache/redis.service';
import { Planet, PlanetStatus } from '../../planet/planet.entity';
import { Travel, TravelStatus } from '../travel.entity';

/**
 * Travel 만료 관리 유틸리티
 * - 만료된 Travel 찾기 및 처리
 * - 관련 Planet들 비활성화
 * - 만료 예정 알림 관리
 */
export class TravelExpiryManager {
  private readonly logger = new Logger(TravelExpiryManager.name);

  constructor(
    private readonly travelRepository: Repository<Travel>,
    private readonly planetRepository: Repository<Planet>,
    private readonly redisService?: RedisService,
  ) {}

  /**
   * 만료된 Travel들을 찾아서 처리
   * @returns 처리된 Travel 개수
   */
  async processExpiredTravels(): Promise<number> {
    this.logger.log('만료된 Travel 처리 시작');

    // 만료된 활성 Travel들 조회
    const expiredTravels = await this.findExpiredTravels();

    if (expiredTravels.length === 0) {
      this.logger.log('만료된 Travel이 없습니다');
      return 0;
    }

    this.logger.log(`${expiredTravels.length}개의 만료된 Travel 발견`);

    let processedCount = 0;

    for (const travel of expiredTravels) {
      try {
        await this.expireTravel(travel);
        processedCount++;
        this.logger.log(
          `Travel 만료 처리 완료: ${travel.name} (ID: ${travel.id})`,
        );
      } catch (error) {
        this.logger.error(
          `Travel 만료 처리 실패: ${travel.name} (ID: ${travel.id})`,
          error,
        );
      }
    }

    this.logger.log(`만료된 Travel 처리 완료: ${processedCount}개 처리됨`);
    return processedCount;
  }

  /**
   * 만료 예정인 Travel들 찾기
   * @param warningDays 경고할 일 수 (기본: 7일)
   * @returns 만료 예정 Travel 목록
   */
  async findExpiringTravels(warningDays: number = 7): Promise<Travel[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    return this.travelRepository
      .createQueryBuilder('travel')
      .where('travel.isActive = :isActive', { isActive: true })
      .andWhere('travel.status != :expiredStatus', {
        expiredStatus: TravelStatus.EXPIRED,
      })
      .andWhere('travel.expiryDate > :now', { now: new Date() })
      .andWhere('travel.expiryDate <= :warningDate', { warningDate })
      .orderBy('travel.expiryDate', 'ASC')
      .getMany();
  }

  /**
   * 특정 Travel의 만료 예정 알림 처리
   * @param travelId Travel ID
   * @returns 알림 처리 성공 여부
   */
  async processExpiryWarning(travelId: number): Promise<boolean> {
    try {
      const travel = await this.travelRepository.findOne({
        where: { id: travelId, isActive: true },
      });

      if (!travel || travel.isExpired()) {
        return false;
      }

      const expiryStatus = travel.getExpiryStatus();

      if (expiryStatus.isWarning) {
        // Redis에 만료 예정 알림 정보 저장
        if (this.redisService) {
          await this.redisService.setJson(
            `travel:${travelId}:expiry_warning`,
            {
              travelId,
              travelName: travel.name,
              daysUntilExpiry: expiryStatus.daysUntilExpiry,
              expiryDate: expiryStatus.expiryDate,
              warningGeneratedAt: new Date(),
            },
            7 * 24 * 60 * 60, // 7일 TTL
          );
        }

        this.logger.warn(
          `Travel 만료 예정 알림: ${travel.name} (${expiryStatus.daysUntilExpiry}일 남음)`,
        );

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `만료 예정 알림 처리 실패 (Travel ID: ${travelId})`,
        error,
      );
      return false;
    }
  }

  /**
   * 특정 Travel 강제 만료 (관리자용)
   */
  async forceExpireTravel(travelId: number): Promise<boolean> {
    try {
      const travel = await this.travelRepository.findOne({
        where: { id: travelId },
      });

      if (!travel) {
        this.logger.warn(`Travel not found: ${travelId}`);
        return false;
      }

      await this.expireTravel(travel);
      this.logger.log(`Travel 강제 만료: ${travel.name} (ID: ${travelId})`);
      return true;
    } catch (error) {
      this.logger.error(`Travel 강제 만료 실패 (ID: ${travelId})`, error);
      return false;
    }
  }

  /**
   * 만료된 Travel 복구 (관리자용)
   * - 만료 날짜를 연장한 후 호출
   */
  async reactivateExpiredTravel(
    travelId: number,
    newExpiryDate: Date,
  ): Promise<boolean> {
    try {
      const travel = await this.travelRepository.findOne({
        where: { id: travelId, status: TravelStatus.EXPIRED },
      });

      if (!travel) {
        this.logger.warn(`만료된 Travel not found: ${travelId}`);
        return false;
      }

      // 새 만료 날짜 설정
      travel.expiryDate = newExpiryDate;
      travel.reactivateFromExpiry();

      await this.travelRepository.save(travel);

      // 관련 Planet들도 다시 활성화
      await this.reactivateTravelPlanets(travel);

      // Redis 캐시 갱신
      if (this.redisService) {
        await this.redisService.setJson(`travel:${travelId}`, travel);
        await this.redisService.del(`travel:${travelId}:expiry_warning`);
      }

      this.logger.log(`Travel 복구 완료: ${travel.name} (ID: ${travelId})`);
      return true;
    } catch (error) {
      this.logger.error(`Travel 복구 실패 (ID: ${travelId})`, error);
      return false;
    }
  }

  /**
   * Travel 만료 상태 정보 조회
   */
  async getTravelExpiryInfo(travelId: number): Promise<any> {
    const travel = await this.travelRepository.findOne({
      where: { id: travelId },
    });

    if (!travel) {
      return null;
    }

    const expiryStatus = travel.getExpiryStatus();
    const expiredPlanetsCount = await this.getExpiredPlanetsCount(travelId);

    return {
      travel: {
        id: travel.id,
        name: travel.name,
        status: travel.status,
        isActive: travel.isActive,
      },
      expiry: expiryStatus,
      planets: {
        total: travel.planetCount,
        expired: expiredPlanetsCount,
      },
    };
  }

  /**
   * 만료된 Travel 찾기
   */
  private async findExpiredTravels(): Promise<Travel[]> {
    return this.travelRepository
      .createQueryBuilder('travel')
      .where('travel.isActive = :isActive', { isActive: true })
      .andWhere('travel.status != :expiredStatus', {
        expiredStatus: TravelStatus.EXPIRED,
      })
      .andWhere('travel.expiryDate < :now', { now: new Date() })
      .getMany();
  }

  /**
   * Travel 만료 처리 (Planet들 포함)
   */
  private async expireTravel(travel: Travel): Promise<void> {
    // Travel 만료 처리
    travel.expire();
    await this.travelRepository.save(travel);

    // 관련된 모든 Planet들 비활성화
    await this.expireTravelPlanets(travel);

    // Redis 캐시 업데이트
    if (this.redisService) {
      await this.redisService.setJson(`travel:${travel.id}`, travel);
      await this.redisService.del(`travel:${travel.id}:expiry_warning`);
    }
  }

  /**
   * Travel의 모든 Planet들 만료 처리
   */
  private async expireTravelPlanets(travel: Travel): Promise<void> {
    const result = await this.planetRepository
      .createQueryBuilder()
      .update(Planet)
      .set({
        isActive: false,
        status: PlanetStatus.INACTIVE,
      })
      .where('travelId = :travelId', { travelId: travel.id })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    const affectedPlanets = result.affected || 0;
    this.logger.log(
      `Travel ${travel.name}의 ${affectedPlanets}개 Planet 비활성화 완료`,
    );

    // Redis에서 Planet 캐시들 제거
    if (this.redisService) {
      const planets = await this.planetRepository.find({
        where: { travelId: travel.id },
        select: ['id'],
      });

      for (const planet of planets) {
        await this.redisService.del(`planet:${planet.id}`);
      }
    }
  }

  /**
   * Travel의 Planet들 재활성화 (복구용)
   */
  private async reactivateTravelPlanets(travel: Travel): Promise<void> {
    const result = await this.planetRepository
      .createQueryBuilder()
      .update(Planet)
      .set({
        isActive: true,
        status: PlanetStatus.ACTIVE,
      })
      .where('travelId = :travelId', { travelId: travel.id })
      .andWhere('status = :inactiveStatus', {
        inactiveStatus: PlanetStatus.INACTIVE,
      })
      .execute();

    const affectedPlanets = result.affected || 0;
    this.logger.log(
      `Travel ${travel.name}의 ${affectedPlanets}개 Planet 재활성화 완료`,
    );
  }

  /**
   * Travel의 만료된 Planet 개수 조회
   */
  private async getExpiredPlanetsCount(travelId: number): Promise<number> {
    return this.planetRepository.count({
      where: {
        travelId,
        isActive: false,
        status: PlanetStatus.INACTIVE,
      },
    });
  }
}
