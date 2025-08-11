import { CrudService } from '@foryourdev/nestjs-crud';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { RedisService } from '../cache/redis.service';
import { Message } from '../message/message.entity';
import { Planet } from '../planet/planet.entity';
import { TravelUser } from '../travel-user/travel-user.entity';
import { Travel } from '../travel/travel.entity';
import { User } from '../user/user.entity';
import {
  AggregationPeriod,
  Analytics,
  AnalyticsType,
} from './analytics.entity';

/**
 * Travel 통계 인터페이스
 */
export interface TravelStats {
  travelId: number;
  travelName: string;
  memberCount: number;
  activeMemberCount: number; // 지난 24시간 활성 사용자
  planetCount: number;
  activePlanetCount: number; // 지난 24시간 활성 Planet
  totalMessages: number;
  todayMessages: number;
  averageEngagement: number; // 참여도 점수
  retentionRate: number; // 멤버 유지율
  growthRate: number; // 성장률
  peakActivityTime: Date;
  createdAt: Date;
  daysActive: number;
}

/**
 * Planet 통계 인터페이스
 */
export interface PlanetStats {
  planetId: number;
  planetName: string;
  planetType: string;
  travelId?: number;
  memberCount: number;
  activeMemberCount: number;
  totalMessages: number;
  todayMessages: number;
  averageMessageLength: number;
  uniqueParticipants: number;
  messageFrequency: number; // 시간당 메시지 수
  engagementScore: number;
  silentHours: number; // 조용한 시간
  peakActivityHour: number;
  lastActiveAt: Date;
  createdAt: Date;
}

/**
 * 사용자 활동 통계 인터페이스
 */
export interface UserActivityStats {
  userId: number;
  userName: string;
  totalTravels: number;
  activeTravels: number;
  totalPlanets: number;
  activePlanets: number;
  totalMessages: number;
  todayMessages: number;
  averageMessageLength: number;
  engagementScore: number;
  lastActivityAt: Date;
  joinedTravelsThisMonth: number;
  leftTravelsThisMonth: number;
}

/**
 * 대시보드 데이터 인터페이스
 */
export interface DashboardData {
  overview: {
    totalTravels: number;
    activeTravels: number;
    totalPlanets: number;
    activePlanets: number;
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
    todayMessages: number;
  };
  trends: {
    userGrowth: { date: Date; value: number }[];
    messageVolume: { date: Date; value: number }[];
    travelActivity: { date: Date; value: number }[];
    engagement: { date: Date; value: number }[];
  };
  topPerformers: {
    topTravels: TravelStats[];
    topPlanets: PlanetStats[];
    activeUsers: UserActivityStats[];
  };
  insights: {
    peakHours: { hour: number; messageCount: number }[];
    popularPlanetTypes: { type: string; count: number }[];
    retentionRates: { period: string; rate: number }[];
  };
}

@Injectable()
export class AnalyticsService extends CrudService<Analytics> {
  private readonly logger = new Logger(AnalyticsService.name);

  // Redis 캐시 키
  private readonly CACHE_PREFIX = 'analytics';
  private readonly STATS_CACHE_TTL = 3600; // 1시간
  private readonly DASHBOARD_CACHE_TTL = 1800; // 30분

  constructor(
    @InjectRepository(Analytics)
    public readonly repository: Repository<Analytics>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly redisService: RedisService,
  ) {
    super(repository);
  }

  /**
   * Travel 통계 수집
   */
  async collectTravelStats(travelId: number): Promise<TravelStats> {
    try {
      const travel = await this.travelRepository.findOne({
        where: { id: travelId },
        relations: ['travelUsers', 'planets'],
      });

      if (!travel) {
        throw new Error(`Travel ${travelId} not found`);
      }

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 멤버 수 계산
      const memberCount = travel.travelUsers.length;

      // 활성 멤버 수 (지난 24시간 메시지를 보낸 멤버)
      const activeMemberCount = await this.messageRepository
        .createQueryBuilder('message')
        .innerJoin('message.planet', 'planet')
        .where('planet.travelId = :travelId', { travelId })
        .andWhere('message.createdAt > :yesterday', { yesterday })
        .select('COUNT(DISTINCT message.senderId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // Planet 수 계산
      const planetCount = travel.planets.length;
      const activePlanetCount = await this.messageRepository
        .createQueryBuilder('message')
        .innerJoin('message.planet', 'planet')
        .where('planet.travelId = :travelId', { travelId })
        .andWhere('message.createdAt > :yesterday', { yesterday })
        .select('COUNT(DISTINCT message.planetId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // 메시지 통계
      const totalMessages = await this.messageRepository.count({
        where: {
          planet: { travelId },
        },
      });

      const todayMessages = await this.messageRepository.count({
        where: {
          planet: { travelId },
          createdAt: MoreThan(yesterday),
        },
      });

      // 참여도 점수 계산 (0-100)
      const averageEngagement = this.calculateEngagementScore(
        memberCount,
        activeMemberCount,
        planetCount,
        activePlanetCount,
      );

      // 멤버 유지율 (지난 주 대비)
      const membersLastWeek = await this.travelUserRepository.count({
        where: {
          travelId,
          createdAt: LessThan(lastWeek),
        },
      });

      const retentionRate =
        membersLastWeek > 0
          ? Math.round((memberCount / membersLastWeek) * 100)
          : 100;

      // 성장률 (지난 주 대비 멤버 증가)
      const growthRate =
        membersLastWeek > 0
          ? Math.round(
              ((memberCount - membersLastWeek) / membersLastWeek) * 100,
            )
          : 0;

      // 피크 활동 시간 (가장 메시지가 많은 시간)
      const peakActivity = await this.messageRepository
        .createQueryBuilder('message')
        .innerJoin('message.planet', 'planet')
        .where('planet.travelId = :travelId', { travelId })
        .andWhere('message.createdAt > :lastWeek', { lastWeek })
        .select("DATE_TRUNC('hour', message.createdAt)", 'hour')
        .addSelect('COUNT(*)', 'count')
        .groupBy('hour')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne();

      const peakActivityTime = peakActivity?.hour || new Date();

      // 활동 일수 계산
      const daysActive = Math.floor(
        (today.getTime() - travel.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      );

      return {
        travelId: travel.id,
        travelName: travel.name,
        memberCount,
        activeMemberCount,
        planetCount,
        activePlanetCount,
        totalMessages,
        todayMessages,
        averageEngagement,
        retentionRate,
        growthRate,
        peakActivityTime,
        createdAt: travel.createdAt,
        daysActive,
      };
    } catch (error) {
      this.logger.error(
        `Failed to collect travel stats for ${travelId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Planet 통계 수집
   */
  async collectPlanetStats(planetId: number): Promise<PlanetStats> {
    try {
      const planet = await this.planetRepository.findOne({
        where: { id: planetId },
        relations: ['travel', 'planetUsers'],
      });

      if (!planet) {
        throw new Error(`Planet ${planetId} not found`);
      }

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 멤버 수 계산
      const memberCount = planet.travel
        ? planet.travel.travelUsers?.length || 0
        : planet.planetUsers?.length || 0;

      // 활성 멤버 수
      const activeMemberCount = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.createdAt > :yesterday', { yesterday })
        .select('COUNT(DISTINCT message.senderId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // 메시지 통계
      const totalMessages = await this.messageRepository.count({
        where: { planetId },
      });

      const todayMessages = await this.messageRepository.count({
        where: {
          planetId,
          createdAt: MoreThan(yesterday),
        },
      });

      // 평균 메시지 길이
      const avgLengthResult = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.type = :type', { type: 'TEXT' })
        .select('AVG(LENGTH(message.content))', 'avgLength')
        .getRawOne();

      const averageMessageLength = Math.round(
        parseFloat(avgLengthResult.avgLength) || 0,
      );

      // 고유 참여자 수 (지난 주)
      const uniqueParticipants = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.createdAt > :lastWeek', { lastWeek })
        .select('COUNT(DISTINCT message.senderId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // 메시지 빈도 (시간당)
      const hoursSinceCreation = Math.max(
        1,
        (today.getTime() - planet.createdAt.getTime()) / (60 * 60 * 1000),
      );
      const messageFrequency =
        Math.round((totalMessages / hoursSinceCreation) * 100) / 100;

      // 참여도 점수
      const engagementScore = this.calculatePlanetEngagement(
        memberCount,
        activeMemberCount,
        messageFrequency,
        uniqueParticipants,
      );

      // 조용한 시간 (메시지 없는 연속 시간)
      const silentHours = await this.calculateSilentHours(planetId);

      // 피크 활동 시간
      const peakHourResult = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.planetId = :planetId', { planetId })
        .andWhere('message.createdAt > :lastWeek', { lastWeek })
        .select('EXTRACT(HOUR FROM message.createdAt)', 'hour')
        .addSelect('COUNT(*)', 'count')
        .groupBy('hour')
        .orderBy('count', 'DESC')
        .limit(1)
        .getRawOne();

      const peakActivityHour = parseInt(peakHourResult?.hour) || 12;

      // 마지막 활동 시간
      const lastMessage = await this.messageRepository.findOne({
        where: { planetId },
        order: { createdAt: 'DESC' },
      });

      const lastActiveAt = lastMessage?.createdAt || planet.createdAt;

      return {
        planetId: planet.id,
        planetName: planet.name,
        planetType: planet.type,
        travelId: planet.travelId,
        memberCount,
        activeMemberCount,
        totalMessages,
        todayMessages,
        averageMessageLength,
        uniqueParticipants,
        messageFrequency,
        engagementScore,
        silentHours,
        peakActivityHour,
        lastActiveAt,
        createdAt: planet.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to collect planet stats for ${planetId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 사용자 활동 통계 수집
   */
  async collectUserActivityStats(userId: number): Promise<UserActivityStats> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Travel 통계
      const totalTravels = await this.travelUserRepository.count({
        where: { userId },
      });

      const activeTravels = await this.travelUserRepository
        .createQueryBuilder('travelUser')
        .innerJoin('travelUser.travel', 'travel')
        .innerJoin('travel.planets', 'planet')
        .innerJoin('planet.messages', 'message')
        .where('travelUser.userId = :userId', { userId })
        .andWhere('message.createdAt > :yesterday', { yesterday })
        .select('COUNT(DISTINCT travelUser.travelId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // Planet 통계
      const totalPlanets = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.senderId = :userId', { userId })
        .select('COUNT(DISTINCT message.planetId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      const activePlanets = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.senderId = :userId', { userId })
        .andWhere('message.createdAt > :yesterday', { yesterday })
        .select('COUNT(DISTINCT message.planetId)', 'count')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0);

      // 메시지 통계
      const totalMessages = await this.messageRepository.count({
        where: { senderId: userId },
      });

      const todayMessages = await this.messageRepository.count({
        where: {
          senderId: userId,
          createdAt: MoreThan(yesterday),
        },
      });

      // 평균 메시지 길이
      const avgLengthResult = await this.messageRepository
        .createQueryBuilder('message')
        .where('message.senderId = :userId', { userId })
        .andWhere('message.type = :type', { type: 'TEXT' })
        .select('AVG(LENGTH(message.content))', 'avgLength')
        .getRawOne();

      const averageMessageLength = Math.round(
        parseFloat(avgLengthResult.avgLength) || 0,
      );

      // 참여도 점수 계산
      const engagementScore = this.calculateUserEngagement(
        totalTravels,
        activeTravels,
        totalPlanets,
        activePlanets,
        totalMessages,
        todayMessages,
      );

      // 지난 달 가입/탈퇴한 Travel 수
      const joinedTravelsThisMonth = await this.travelUserRepository.count({
        where: {
          userId,
          createdAt: MoreThan(lastMonth),
        },
      });

      const leftTravelsThisMonth = await this.travelUserRepository.count({
        where: {
          userId,
          leftAt: MoreThan(lastMonth),
        },
      });

      return {
        userId,
        userName: user.name,
        totalTravels,
        activeTravels,
        totalPlanets,
        activePlanets,
        totalMessages,
        todayMessages,
        averageMessageLength,
        engagementScore,
        lastActivityAt: user.lastSeenAt || user.createdAt,
        joinedTravelsThisMonth,
        leftTravelsThisMonth,
      };
    } catch (error) {
      this.logger.error(
        `Failed to collect user activity stats for ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 대시보드 데이터 생성
   */
  async generateDashboardData(): Promise<DashboardData> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:dashboard:${new Date().toDateString()}`;
      const cached = await this.redisService.getJson<DashboardData>(cacheKey);

      if (cached) {
        return cached;
      }

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 개요 데이터
      const overview = {
        totalTravels: await this.travelRepository.count(),
        activeTravels: await this.getActiveTravelsCount(),
        totalPlanets: await this.planetRepository.count(),
        activePlanets: await this.getActivePlanetsCount(),
        totalUsers: await this.userRepository.count(),
        activeUsers: await this.getActiveUsersCount(),
        totalMessages: await this.messageRepository.count(),
        todayMessages: await this.messageRepository.count({
          where: { createdAt: MoreThan(yesterday) },
        }),
      };

      // 트렌드 데이터 (지난 30일)
      const trends = await this.generateTrendData(lastMonth, today);

      // 상위 성과자
      const topPerformers = await this.getTopPerformers();

      // 인사이트
      const insights = await this.generateInsights();

      const dashboardData: DashboardData = {
        overview,
        trends,
        topPerformers,
        insights,
      };

      // 캐시 저장
      await this.redisService.setJson(
        cacheKey,
        dashboardData,
        this.DASHBOARD_CACHE_TTL,
      );

      return dashboardData;
    } catch (error) {
      this.logger.error(`Failed to generate dashboard data: ${error.message}`);
      throw error;
    }
  }

  /**
   * 분석 데이터 저장
   */
  async saveAnalytics(
    type: AnalyticsType,
    entityType: string,
    entityId: number,
    period: AggregationPeriod,
    date: Date,
    metrics: any,
    dimensions?: any,
  ): Promise<Analytics> {
    try {
      const existing = await this.repository.findOne({
        where: { type, entityType, entityId, period, date },
      });

      if (existing) {
        existing.metrics = metrics;
        existing.dimensions = dimensions;
        return await this.repository.save(existing);
      }

      const analytics = this.repository.create({
        type,
        entityType,
        entityId,
        period,
        date,
        metrics,
        dimensions,
        metadata: {
          generatedBy: 'AnalyticsService',
          generationTime: new Date(),
          dataSource: 'database',
          version: '1.0',
        },
      });

      return await this.repository.save(analytics);
    } catch (error) {
      this.logger.error(`Failed to save analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 매일 자동 통계 수집 (크론 작업)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async collectDailyAnalytics(): Promise<void> {
    this.logger.log('Starting daily analytics collection...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Travel 통계 수집
      const travels = await this.travelRepository.find({ select: ['id'] });
      for (const travel of travels) {
        try {
          const stats = await this.collectTravelStats(travel.id);
          await this.saveAnalytics(
            AnalyticsType.TRAVEL_OVERVIEW,
            'travel',
            travel.id,
            AggregationPeriod.DAILY,
            today,
            stats,
          );
        } catch (error) {
          this.logger.error(
            `Failed to collect stats for travel ${travel.id}: ${error.message}`,
          );
        }
      }

      // Planet 통계 수집
      const planets = await this.planetRepository.find({ select: ['id'] });
      for (const planet of planets) {
        try {
          const stats = await this.collectPlanetStats(planet.id);
          await this.saveAnalytics(
            AnalyticsType.PLANET_ACTIVITY,
            'planet',
            planet.id,
            AggregationPeriod.DAILY,
            today,
            stats,
          );
        } catch (error) {
          this.logger.error(
            `Failed to collect stats for planet ${planet.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Daily analytics collection completed');
    } catch (error) {
      this.logger.error(`Daily analytics collection failed: ${error.message}`);
    }
  }

  // ==============================
  // Private Helper Methods
  // ==============================

  /**
   * 참여도 점수 계산
   */
  private calculateEngagementScore(
    totalMembers: number,
    activeMembers: number,
    totalPlanets: number,
    activePlanets: number,
  ): number {
    if (totalMembers === 0 || totalPlanets === 0) return 0;

    const memberEngagement = (activeMembers / totalMembers) * 50;
    const planetEngagement = (activePlanets / totalPlanets) * 50;

    return Math.round(memberEngagement + planetEngagement);
  }

  /**
   * Planet 참여도 점수 계산
   */
  private calculatePlanetEngagement(
    totalMembers: number,
    activeMembers: number,
    messageFrequency: number,
    uniqueParticipants: number,
  ): number {
    if (totalMembers === 0) return 0;

    const memberRatio = (activeMembers / totalMembers) * 30;
    const participationRatio = (uniqueParticipants / totalMembers) * 30;
    const activityBonus = Math.min(messageFrequency * 5, 40);

    return Math.round(memberRatio + participationRatio + activityBonus);
  }

  /**
   * 사용자 참여도 점수 계산
   */
  private calculateUserEngagement(
    totalTravels: number,
    activeTravels: number,
    totalPlanets: number,
    activePlanets: number,
    totalMessages: number,
    todayMessages: number,
  ): number {
    let score = 0;

    // Travel 참여도
    if (totalTravels > 0) {
      score += (activeTravels / totalTravels) * 30;
    }

    // Planet 참여도
    if (totalPlanets > 0) {
      score += (activePlanets / totalPlanets) * 30;
    }

    // 메시지 활동도
    const messageActivity = Math.min(
      (todayMessages / Math.max(1, totalMessages)) * 1000,
      40,
    );
    score += messageActivity;

    return Math.round(score);
  }

  /**
   * 조용한 시간 계산
   */
  private async calculateSilentHours(planetId: number): Promise<number> {
    // 간단한 구현 - 실제로는 더 복잡한 로직 필요
    return 0;
  }

  /**
   * 활성 Travel 수 조회
   */
  private async getActiveTravelsCount(): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.planet', 'planet')
      .where('message.createdAt > :yesterday', { yesterday })
      .select('COUNT(DISTINCT planet.travelId)', 'count')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * 활성 Planet 수 조회
   */
  private async getActivePlanetsCount(): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.messageRepository
      .createQueryBuilder('message')
      .where('message.createdAt > :yesterday', { yesterday })
      .select('COUNT(DISTINCT message.planetId)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);
  }

  /**
   * 활성 사용자 수 조회
   */
  private async getActiveUsersCount(): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.messageRepository
      .createQueryBuilder('message')
      .where('message.createdAt > :yesterday', { yesterday })
      .select('COUNT(DISTINCT message.senderId)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);
  }

  /**
   * 트렌드 데이터 생성
   */
  private async generateTrendData(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // 간단한 구현 - 실제로는 더 세밀한 트렌드 분석 필요
    return {
      userGrowth: [],
      messageVolume: [],
      travelActivity: [],
      engagement: [],
    };
  }

  /**
   * 상위 성과자 조회
   */
  private async getTopPerformers(): Promise<any> {
    return {
      topTravels: [],
      topPlanets: [],
      activeUsers: [],
    };
  }

  /**
   * 인사이트 생성
   */
  private async generateInsights(): Promise<any> {
    return {
      peakHours: [],
      popularPlanetTypes: [],
      retentionRates: [],
    };
  }
}
