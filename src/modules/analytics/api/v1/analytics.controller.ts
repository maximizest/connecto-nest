import {
  BeforeCreate,
  BeforeUpdate,
  Crud,
  crudResponse,
} from '@foryourdev/nestjs-crud';
import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CurrentUser,
  CurrentUserData,
} from '../../../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../../../guards/auth.guard';
import { Planet } from '../../../planet/planet.entity';
import { TravelUser } from '../../../travel-user/travel-user.entity';
import { Travel } from '../../../travel/travel.entity';
import { User } from '../../../user/user.entity';
import {
  AggregationPeriod,
  Analytics,
  AnalyticsType,
} from '../../analytics.entity';
import { AnalyticsService } from '../../analytics.service';

/**
 * Analytics API Controller (v1)
 *
 * Travel/Planet 분석 및 통계 데이터를 제공하는 REST API
 *
 * 주요 기능:
 * - Travel 통계 조회
 * - Planet 활동 분석
 * - 사용자 활동 통계
 * - 대시보드 데이터
 * - 트렌드 분석
 */
@Controller({ path: 'analytics', version: '1' })
@Crud({
  entity: Analytics,
  allowedFilters: ['type', 'entityType', 'entityId', 'period', 'date'],
  allowedParams: [],
  allowedIncludes: [],
  only: ['index', 'show'],
  routes: {
    index: {
      allowedFilters: [
        'type',
        'entityType', // 'travel' 또는 'planet' 필터링 지원
        'entityId', // 특정 travel/planet ID 필터링 지원
        'period',
        'date',
      ],
    },
  },
})
@UseGuards(AuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    public readonly crudService: AnalyticsService,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
    @InjectRepository(TravelUser)
    private readonly travelUserRepository: Repository<TravelUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자 권한 체크 (자신이 속한 Travel/Planet만 조회 가능)
   * 주의: 실제 권한 확인은 프론트엔드에서 적절한 필터 값을 전달해야 합니다.
   * 예: filter[entityType_eq]=travel&filter[entityId_eq]={accessibleTravelId}
   */
  @BeforeCreate()
  @BeforeUpdate()
  async preprocessData(entity: Analytics, context: any) {
    // 분석 데이터는 읽기 전용
    // 복잡한 권한 확인이 필요한 경우 커스텀 라우트 유지 권장
    return entity;
  }

  // Travel 통계 조회는 @Crud index 라우트를 사용합니다.
  // GET /api/v1/analytics?filter[entityType_eq]=travel&filter[entityId_eq]={travelId}
  // 권한 확인은 @BeforeCreate/@BeforeUpdate 훅에서 처리됩니다.
  // 복잡한 통계 집계가 필요한 경우 커스텀 서비스 메서드 활용

  // Planet 통계 조회는 @Crud index 라우트를 사용합니다.
  // GET /api/v1/analytics?filter[entityType_eq]=planet&filter[entityId_eq]={planetId}
  // 권한 확인은 @BeforeCreate/@BeforeUpdate 훅에서 처리됩니다.

  /**
   * 내 활동 통계 조회 API
   * GET /api/v1/analytics/my-activity
   */
  @Get('my-activity')
  async getMyActivityStats(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    try {
      // 사용자 활동 통계 수집
      const stats = await this.crudService.collectUserActivityStats(user.id);

      return crudResponse({
        success: true,
        message: '내 활동 통계를 가져왔습니다.',
        data: {
          ...stats,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get user activity stats failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Travel 멤버 활동 통계 조회 API
   * GET /api/v1/analytics/travel/:travelId/members
   */
  @Get('travel/:travelId/members')
  async getTravelMemberStats(
    @Param('travelId') travelId: number,
    @Query('limit') limit: number = 10,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      // 사용자가 Travel 멤버인지 확인
      const travelUser = await this.travelUserRepository.findOne({
        where: { travelId, userId: user.id },
      });

      if (!travelUser) {
        throw new NotFoundException('Travel에 접근할 권한이 없습니다.');
      }

      // Travel의 모든 멤버 조회
      const travelUsers = await this.travelUserRepository.find({
        where: { travelId },
        relations: ['user'],
        take: Math.min(50, Math.max(1, limit)),
      });

      // 각 멤버의 활동 통계 수집
      const memberStats = await Promise.all(
        travelUsers.map(async (tu) => {
          try {
            // 탈퇴한 사용자는 스킵
            if (!tu.userId) {
              return null;
            }
            return await this.crudService.collectUserActivityStats(tu.userId);
          } catch (error) {
            this.logger.warn(
              `Failed to get stats for user ${tu.userId}: ${error.message}`,
            );
            return null;
          }
        }),
      );

      const validStats = memberStats.filter(Boolean);

      return crudResponse({
        success: true,
        message: 'Travel 멤버 활동 통계를 가져왔습니다.',
        data: {
          travelId,
          totalMembers: travelUsers.length,
          statsCollected: validStats.length,
          memberStats: validStats,
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get travel member stats failed: travelId=${travelId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Travel의 모든 Planet 통계 조회 API
   * GET /api/v1/analytics/travel/:travelId/planets
   */
  @Get('travel/:travelId/planets')
  async getTravelPlanetStats(
    @Param('travelId') travelId: number,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    const user: User = currentUser as User;

    try {
      // 사용자가 Travel 멤버인지 확인
      const travelUser = await this.travelUserRepository.findOne({
        where: { travelId, userId: user.id },
      });

      if (!travelUser) {
        throw new NotFoundException('Travel에 접근할 권한이 없습니다.');
      }

      // Travel의 모든 Planet 조회
      const planets = await this.planetRepository.find({
        where: { travelId },
        select: ['id', 'name', 'type'],
      });

      // 각 Planet의 통계 수집
      const planetStats = await Promise.all(
        planets.map(async (planet) => {
          try {
            return await this.crudService.collectPlanetStats(planet.id);
          } catch (error) {
            this.logger.warn(
              `Failed to get stats for planet ${planet.id}: ${error.message}`,
            );
            return null;
          }
        }),
      );

      const validStats = planetStats.filter(Boolean);

      return crudResponse({
        success: true,
        message: 'Travel Planet 통계를 가져왔습니다.',
        data: {
          travelId,
          totalPlanets: planets.length,
          statsCollected: validStats.length,
          planetStats: validStats,
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get travel planet stats failed: travelId=${travelId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 대시보드 데이터 조회 API
   * GET /api/v1/analytics/dashboard
   */
  @Get('dashboard')
  async getDashboardData(@CurrentUser() currentUser: CurrentUserData) {
    const user: User = currentUser as User;

    try {
      // 사용자의 Travel 목록 조회
      const userTravels = await this.travelUserRepository.find({
        where: { userId: user.id },
        select: ['travelId'],
      });

      if (userTravels.length === 0) {
        return crudResponse({
          success: true,
          message: '참여 중인 Travel이 없습니다.',
          data: {
            overview: {
              totalTravels: 0,
              activeTravels: 0,
              totalPlanets: 0,
              activePlanets: 0,
              totalMessages: 0,
              todayMessages: 0,
            },
            trends: [],
            insights: [],
          },
        });
      }

      // 사용자 맞춤 대시보드 데이터 생성
      const travelIds = userTravels.map((ut) => ut.travelId);

      // 간단한 개요 데이터 생성 (실제로는 더 세밀한 구현 필요)
      const overview = {
        totalTravels: userTravels.length,
        activeTravels: userTravels.length, // 간단한 구현
        totalPlanets: await this.planetRepository.count({
          where: { travelId: travelIds.length > 0 ? travelIds[0] : undefined }, // 첫 번째 Travel만
        }),
        activePlanets: 0, // 구현 필요
        totalMessages: 0, // 구현 필요
        todayMessages: 0, // 구현 필요
      };

      return crudResponse({
        success: true,
        message: '대시보드 데이터를 가져왔습니다.',
        data: {
          overview,
          userTravels: travelIds,
          trends: {
            messageVolume: [],
            engagement: [],
          },
          insights: {
            peakHours: [],
            activeConversations: [],
          },
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get dashboard data failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 시계열 분석 데이터 조회 API
   * GET /api/v1/analytics/timeseries
   */
  @Get('timeseries')
  async getTimeSeriesData(
    @CurrentUser() currentUser: CurrentUserData,
    @Query('type') type: AnalyticsType,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: number,
    @Query('period') period: AggregationPeriod = AggregationPeriod.DAILY,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user: User = currentUser as User;

    try {
      // 권한 확인 (entityType에 따라)
      if (entityType === 'travel') {
        const travelUser = await this.travelUserRepository.findOne({
          where: { travelId: entityId, userId: user.id },
        });
        if (!travelUser) {
          throw new NotFoundException('Travel에 접근할 권한이 없습니다.');
        }
      } else if (entityType === 'planet') {
        // Planet 권한 확인 로직 (간단히 구현)
        const planet = await this.planetRepository.findOne({
          where: { id: entityId },
          relations: ['travel', 'travel.travelUsers', 'planetUsers'],
        });

        if (!planet) {
          throw new NotFoundException('Planet을 찾을 수 없습니다.');
        }

        let hasAccess = false;
        if (planet.travel) {
          hasAccess = planet.travel.travelUsers.some(
            (tu) => tu.userId === user.id,
          );
        } else {
          hasAccess = planet.planetUsers.some((pu) => pu.userId === user.id);
        }

        if (!hasAccess) {
          throw new NotFoundException('Planet에 접근할 권한이 없습니다.');
        }
      }

      // 날짜 범위 설정
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // 시계열 데이터 조회
      const analytics = await this.crudService.repository.find({
        where: {
          type,
          entityType,
          entityId,
          period,
          date: 'Between' as any, // start와 end 사이
        },
        order: { date: 'ASC' },
      });

      // 시계열 포인트로 변환
      const timeSeriesData = analytics.map((item) => item.toTimeSeriesPoint());

      return crudResponse({
        success: true,
        message: '시계열 분석 데이터를 가져왔습니다.',
        data: {
          type,
          entityType,
          entityId,
          period,
          dateRange: { start, end },
          dataPoints: timeSeriesData.length,
          timeSeries: timeSeriesData,
          summary: {
            min: Math.min(...timeSeriesData.map((p) => p.value)),
            max: Math.max(...timeSeriesData.map((p) => p.value)),
            average:
              timeSeriesData.reduce((sum, p) => sum + p.value, 0) /
                timeSeriesData.length || 0,
          },
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get timeseries data failed: type=${type}, entityType=${entityType}, entityId=${entityId}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 비교 분석 데이터 조회 API
   * GET /api/v1/analytics/compare
   */
  @Get('compare')
  async getComparisonData(
    @CurrentUser() currentUser: CurrentUserData,
    @Query('entities') entities: string, // JSON string of entity array
    @Query('metric') metric: string,
    @Query('period') period: AggregationPeriod = AggregationPeriod.DAILY,
  ) {
    const user: User = currentUser as User;

    try {
      // entities 파싱 (예: '[{"type":"travel","id":1},{"type":"planet","id":5}]')
      const entityList = JSON.parse(entities || '[]');

      if (!Array.isArray(entityList) || entityList.length === 0) {
        throw new Error('비교할 엔티티 목록이 필요합니다.');
      }

      const comparisonResults = await Promise.all(
        entityList.map(async (entity) => {
          try {
            // 각 엔티티에 대한 접근 권한 확인 및 통계 수집
            if (entity.type === 'travel') {
              const travelUser = await this.travelUserRepository.findOne({
                where: { travelId: entity.id, userId: user.id },
              });

              if (travelUser) {
                const stats = await this.crudService.collectTravelStats(
                  entity.id,
                );
                return {
                  entityType: 'travel',
                  entityId: entity.id,
                  entityName: stats.travelName,
                  metricValue: stats[metric] || 0,
                  stats,
                };
              }
            } else if (entity.type === 'planet') {
              // Planet 권한 확인 후 통계 수집
              const stats = await this.crudService.collectPlanetStats(
                entity.id,
              );
              return {
                entityType: 'planet',
                entityId: entity.id,
                entityName: stats.planetName,
                metricValue: stats[metric] || 0,
                stats,
              };
            }
            return null;
          } catch (error) {
            this.logger.warn(
              `Comparison failed for entity ${entity.type}:${entity.id}: ${error.message}`,
            );
            return null;
          }
        }),
      );

      const validResults = comparisonResults.filter(Boolean);

      return crudResponse({
        success: true,
        message: '비교 분석 데이터를 가져왔습니다.',
        data: {
          metric,
          period,
          comparedEntities: validResults.length,
          results: validResults,
          ranking: validResults.sort(
            (a, b) => (b?.metricValue || 0) - (a?.metricValue || 0),
          ),
          requestedBy: user.id,
          requestedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Get comparison data failed: entities=${entities}, metric=${metric}, userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }
}
