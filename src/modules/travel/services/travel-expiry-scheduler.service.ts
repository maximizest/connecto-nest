import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { RedisService } from '../../cache/redis.service';
import { Planet, PlanetStatus } from '../../planet/planet.entity';
import { Travel, TravelStatus } from '../travel.entity';
import { TravelExpiryManager } from '../utils/travel-expiry-manager.util';

/**
 * Travel 만료 관련 스케줄링 서비스
 * - 주기적으로 만료된 Travel 처리
 * - 만료 예정 Travel 알림
 * - 통계 수집 및 로깅
 */
@Injectable()
export class TravelExpirySchedulerService {
  private readonly logger = new Logger(TravelExpirySchedulerService.name);
  private readonly expiryManager: TravelExpiryManager;

  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    private readonly redisService: RedisService,
  ) {
    this.expiryManager = new TravelExpiryManager(
      this.travelRepository,
      this.planetRepository,
      this.redisService,
    );
  }

  /**
   * 매시간 만료된 Travel 처리
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'process-expired-travels',
    timeZone: 'Asia/Seoul',
  })
  async handleExpiredTravels(): Promise<void> {
    this.logger.log('만료된 Travel 처리 작업 시작');

    try {
      const processedCount = await this.expiryManager.processExpiredTravels();

      // Redis에 처리 결과 저장
      await this.redisService.setJson(
        'travel:expiry:last_processed',
        {
          timestamp: new Date(),
          processedCount,
          status: 'success',
        },
        24 * 60 * 60, // 24시간 TTL
      );

      this.logger.log(`만료된 Travel 처리 완료: ${processedCount}개`);
    } catch (error) {
      this.logger.error('만료된 Travel 처리 중 오류 발생', error);

      // 오류 정보도 Redis에 저장
      await this.redisService.setJson(
        'travel:expiry:last_processed',
        {
          timestamp: new Date(),
          processedCount: 0,
          status: 'error',
          error: error.message,
        },
        24 * 60 * 60,
      );
    }
  }

  /**
   * 매일 오전 9시에 만료 예정 알림 처리
   */
  @Cron('0 9 * * *', {
    name: 'process-expiry-warnings',
    timeZone: 'Asia/Seoul',
  })
  async handleExpiryWarnings(): Promise<void> {
    this.logger.log('만료 예정 알림 처리 시작');

    try {
      // 7일 이내 만료 예정 Travel 조회
      const expiringTravels = await this.expiryManager.findExpiringTravels(7);

      let warningCount = 0;

      for (const travel of expiringTravels) {
        const success = await this.expiryManager.processExpiryWarning(
          travel.id,
        );
        if (success) {
          warningCount++;
        }
      }

      // Redis에 알림 처리 결과 저장
      await this.redisService.setJson(
        'travel:expiry:warnings_processed',
        {
          timestamp: new Date(),
          totalExpiringTravels: expiringTravels.length,
          warningsGenerated: warningCount,
          status: 'success',
        },
        24 * 60 * 60,
      );

      this.logger.log(
        `만료 예정 알림 처리 완료: ${expiringTravels.length}개 중 ${warningCount}개 알림 생성`,
      );
    } catch (error) {
      this.logger.error('만료 예정 알림 처리 중 오류 발생', error);

      await this.redisService.setJson(
        'travel:expiry:warnings_processed',
        {
          timestamp: new Date(),
          totalExpiringTravels: 0,
          warningsGenerated: 0,
          status: 'error',
          error: error.message,
        },
        24 * 60 * 60,
      );
    }
  }

  /**
   * 매일 자정에 만료 관련 통계 수집
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'collect-expiry-stats',
    timeZone: 'Asia/Seoul',
  })
  async collectExpiryStatistics(): Promise<void> {
    this.logger.log('만료 관련 통계 수집 시작');

    try {
      const stats = await this.generateExpiryStatistics();

      // Redis에 통계 저장
      await this.redisService.setJson(
        'travel:expiry:daily_stats',
        {
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          ...stats,
          generatedAt: new Date(),
        },
        7 * 24 * 60 * 60, // 7일 보관
      );

      this.logger.log('만료 관련 통계 수집 완료', stats);
    } catch (error) {
      this.logger.error('통계 수집 중 오류 발생', error);
    }
  }

  /**
   * 주간 만료 리포트 생성 (매주 월요일 오전 10시)
   */
  @Cron('0 10 * * MON', {
    name: 'generate-weekly-expiry-report',
    timeZone: 'Asia/Seoul',
  })
  async generateWeeklyExpiryReport(): Promise<void> {
    this.logger.log('주간 만료 리포트 생성 시작');

    try {
      const weeklyStats = await this.buildWeeklyExpiryReport();

      // Redis에 주간 리포트 저장
      await this.redisService.setJson(
        'travel:expiry:weekly_report',
        {
          weekStart: this.getWeekStart(),
          weekEnd: this.getWeekEnd(),
          ...weeklyStats,
          generatedAt: new Date(),
        },
        30 * 24 * 60 * 60, // 30일 보관
      );

      this.logger.log('주간 만료 리포트 생성 완료');
    } catch (error) {
      this.logger.error('주간 리포트 생성 중 오류 발생', error);
    }
  }

  /**
   * 수동으로 만료 처리 작업 실행 (개발/테스트용)
   */
  async manualProcessExpiredTravels(): Promise<{
    processedTravels: number;
    expiringTravels: number;
    statistics: any;
  }> {
    this.logger.log('수동 만료 처리 작업 실행');

    const processedTravels = await this.expiryManager.processExpiredTravels();
    const expiringTravels = (await this.expiryManager.findExpiringTravels(7))
      .length;
    const statistics = await this.generateExpiryStatistics();

    return {
      processedTravels,
      expiringTravels,
      statistics,
    };
  }

  /**
   * 만료 관련 통계 생성
   */
  private async generateExpiryStatistics(): Promise<any> {
    const [
      totalTravels,
      activeTravels,
      expiredTravels,
      expiringIn7Days,
      expiringIn30Days,
      totalExpiredPlanets,
    ] = await Promise.all([
      this.travelRepository.count(),
      this.travelRepository.count({ where: { status: TravelStatus.ACTIVE } }),
      this.travelRepository.count({
        where: {
          status: TravelStatus.INACTIVE,
          endDate: LessThan(new Date()),
        },
      }),
      this.getExpiringTravelsCount(7),
      this.getExpiringTravelsCount(30),
      this.planetRepository.count({
        where: { isActive: false, status: PlanetStatus.INACTIVE },
      }),
    ]);

    return {
      travels: {
        total: totalTravels,
        active: activeTravels,
        expired: expiredTravels,
        expiringIn7Days,
        expiringIn30Days,
      },
      planets: {
        totalExpired: totalExpiredPlanets,
      },
      health: {
        expiryRatio:
          totalTravels > 0 ? (expiredTravels / totalTravels) * 100 : 0,
        upcomingExpiryRatio:
          activeTravels > 0 ? (expiringIn7Days / activeTravels) * 100 : 0,
      },
    };
  }

  /**
   * 주간 만료 리포트 생성
   */
  private async buildWeeklyExpiryReport(): Promise<any> {
    const weekStart = this.getWeekStart();
    const weekEnd = this.getWeekEnd();

    const [travelsExpiredThisWeek, planetsExpiredThisWeek, newTravelsThisWeek] =
      await Promise.all([
        this.travelRepository.count({
          where: {
            status: TravelStatus.INACTIVE,
            endDate: LessThan(new Date()),
            updatedAt: MoreThanOrEqual(weekStart),
          },
        }),
        this.planetRepository.count({
          where: {
            isActive: false,
            status: PlanetStatus.INACTIVE,
            updatedAt: MoreThanOrEqual(weekStart),
          },
        }),
        this.travelRepository.count({
          where: {
            createdAt: MoreThanOrEqual(weekStart),
          },
        }),
      ]);

    return {
      expiry: {
        travelsExpired: travelsExpiredThisWeek,
        planetsExpired: planetsExpiredThisWeek,
      },
      creation: {
        newTravels: newTravelsThisWeek,
      },
    };
  }

  /**
   * 특정 일 수 내 만료 예정 Travel 개수 조회
   */
  private async getExpiringTravelsCount(days: number): Promise<number> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.travelRepository.count({
      where: {
        status: TravelStatus.ACTIVE,
        endDate: MoreThanOrEqual(now),
      },
    });
  }

  /**
   * 이번 주 시작일 (월요일) 계산
   */
  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * 이번 주 종료일 (일요일) 계산
   */
  private getWeekEnd(): Date {
    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }
}
