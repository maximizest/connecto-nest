import { crudResponse } from '@foryourdev/nestjs-crud';
import {
  Controller,
  Get,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../guards/auth.guard';
import { User } from '../../../user/user.entity';
import { SchedulerService } from '../../scheduler.service';

/**
 * Scheduler API Controller (v1)
 *
 * 스케줄링 작업 관리 및 모니터링을 위한 REST API
 *
 * 주요 기능:
 * - 스케줄러 상태 조회
 * - 작업 히스토리 조회
 * - 수동 작업 실행 (관리 목적)
 *
 * 주의: 이 API는 일반 사용자용이므로 기본적인 정보만 제공
 */
@Controller({ path: 'scheduler', version: '1' })
@UseGuards(AuthGuard)
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * 스케줄러 상태 조회 API
   * GET /api/v1/scheduler/status
   */
  @Get('status')
  async getSchedulerStatus(@Request() req: any) {
    const user: User = req.user;

    try {
      const status = await this.schedulerService.getSchedulerStatus();

      // Return User entity with scheduler status data
      const userWithSchedulerStatus = Object.assign(new User(), {
        ...user,
        metadata: {
          schedulerStatus: {
            system: {
              name: 'Travel/Planet Scheduler',
              version: '1.0',
              status: 'running',
              uptime: process.uptime(),
            },
            tasks: {
              summary: status.summary,
              recentTasks: status.tasks.slice(0, 10).map((task) => ({
                name: task.taskName,
                status: task.status,
                lastRun: task.lastRunAt,
                duration: task.duration,
                processedItems: task.processedItems,
                success: task.status === 'success',
              })),
            },
            performance: {
              averageTaskDuration: status.summary.averageDuration,
              successRate:
                status.summary.totalTasks > 0
                  ? Math.round(
                      (status.summary.successfulTasks /
                        status.summary.totalTasks) *
                        100,
                    )
                  : 100,
            },
            requestedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithSchedulerStatus);
    } catch (error) {
      this.logger.error(
        `Get scheduler status failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 시스템 상태 건강성 체크 API
   * GET /api/v1/scheduler/health
   */
  @Get('health')
  async getSystemHealth(@Request() req: any) {
    const user: User = req.user;

    try {
      const status = await this.schedulerService.getSchedulerStatus();

      // 기본적인 건강성 지표
      const recentFailures = status.tasks
        .slice(0, 10)
        .filter((task) => task.status === 'failed').length;

      const lastTaskTime =
        status.tasks.length > 0
          ? new Date(status.tasks[0].lastRunAt).getTime()
          : 0;

      const timeSinceLastTask =
        lastTaskTime > 0 ? Date.now() - lastTaskTime : 0;

      // 건강성 점수 계산 (0-100)
      let healthScore = 100;

      if (recentFailures > 3) healthScore -= 20;
      if (timeSinceLastTask > 86400000) healthScore -= 30; // 24시간 이상
      if (status.summary.failedTasks > status.summary.successfulTasks)
        healthScore -= 25;

      const healthStatus =
        healthScore >= 80
          ? 'healthy'
          : healthScore >= 60
            ? 'warning'
            : 'critical';

      // Return User entity with system health data
      const userWithHealth = Object.assign(new User(), {
        ...user,
        metadata: {
          systemHealth: {
            overall: {
              status: healthStatus,
              score: Math.max(0, healthScore),
              message: this.getHealthMessage(healthScore),
            },
            indicators: {
              recentFailures,
              timeSinceLastTask: Math.round(timeSinceLastTask / 1000 / 60), // minutes
              totalTasks: status.summary.totalTasks,
              successRate:
                status.summary.totalTasks > 0
                  ? Math.round(
                      (status.summary.successfulTasks /
                        status.summary.totalTasks) *
                        100,
                    )
                  : 100,
            },
            recommendations: this.getHealthRecommendations(
              healthScore,
              recentFailures,
              timeSinceLastTask,
            ),
            checkedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithHealth);
    } catch (error) {
      this.logger.error(
        `Get system health failed: userId=${user.id}, error=${error.message}`,
      );

      // 에러 시에도 기본적인 상태 정보 제공
      const userWithHealthError = Object.assign(new User(), {
        ...user,
        metadata: {
          systemHealth: {
            overall: {
              status: 'unknown',
              score: 50,
              message: '상태 확인 중 오류 발생',
            },
            error: error.message,
            checkedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithHealthError);
    }
  }

  /**
   * 작업 히스토리 조회 API
   * GET /api/v1/scheduler/history
   */
  @Get('history')
  async getTaskHistory(@Request() req: any) {
    const user: User = req.user;

    try {
      const status = await this.schedulerService.getSchedulerStatus();

      // 작업별로 그룹핑
      const taskGroups = status.tasks.reduce(
        (groups, task) => {
          if (!groups[task.taskName]) {
            groups[task.taskName] = [];
          }
          groups[task.taskName].push(task);
          return groups;
        },
        {} as Record<string, typeof status.tasks>,
      );

      // 각 작업의 최근 실행 결과와 통계
      const taskSummaries = Object.entries(taskGroups).map(
        ([taskName, tasks]) => {
          const recent = tasks.slice(0, 5); // 최근 5회
          const successCount = recent.filter(
            (t) => t.status === 'success',
          ).length;
          const avgDuration =
            recent.reduce((sum, t) => sum + t.duration, 0) / recent.length;
          const totalProcessed = recent.reduce(
            (sum, t) => sum + t.processedItems,
            0,
          );

          return {
            taskName,
            description: this.getTaskDescription(taskName),
            recentRuns: recent.length,
            successRate: Math.round((successCount / recent.length) * 100),
            averageDuration: Math.round(avgDuration),
            totalProcessedItems: totalProcessed,
            lastRun: tasks[0]?.lastRunAt,
            lastStatus: tasks[0]?.status,
            recentExecutions: recent.map((t) => ({
              runAt: t.lastRunAt,
              status: t.status,
              duration: t.duration,
              processed: t.processedItems,
              error: t.errorMessage,
            })),
          };
        },
      );

      // Return User entity with task history data
      const userWithHistory = Object.assign(new User(), {
        ...user,
        metadata: {
          taskHistory: {
            summary: {
              totalTasks: Object.keys(taskGroups).length,
              totalExecutions: status.tasks.length,
              overallSuccessRate:
                status.summary.totalTasks > 0
                  ? Math.round(
                      (status.summary.successfulTasks /
                        status.summary.totalTasks) *
                        100,
                    )
                  : 100,
            },
            tasks: taskSummaries,
            requestedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithHistory);
    } catch (error) {
      this.logger.error(
        `Get task history failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 시스템 정보 API
   * GET /api/v1/scheduler/info
   */
  @Get('info')
  async getSystemInfo(@Request() req: any) {
    const user: User = req.user;

    try {
      // Node.js 프로세스 정보
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Return User entity with system info data
      const userWithSystemInfo = Object.assign(new User(), {
        ...user,
        metadata: {
          systemInfo: {
            application: {
              name: 'Connecto-Nest Scheduler',
              version: process.env.npm_package_version || '1.0.0',
              environment: process.env.NODE_ENV || 'development',
              uptime: Math.round(process.uptime()),
              pid: process.pid,
            },
            runtime: {
              nodeVersion: process.version,
              platform: process.platform,
              architecture: process.arch,
            },
            memory: {
              totalMemory: Math.round(memUsage.rss / 1024 / 1024), // MB
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
              external: Math.round(memUsage.external / 1024 / 1024), // MB
            },
            cpu: {
              user: cpuUsage.user,
              system: cpuUsage.system,
            },
            scheduledTasks: [
              {
                name: 'processExpiredTravels',
                schedule: 'Daily at midnight',
                description: 'Travel 만료 처리 및 Planet 비활성화',
              },
              {
                name: 'sendExpiryWarnings',
                schedule: 'Daily at 9 AM',
                description: 'Travel 만료 경고 알림 전송',
              },
              {
                name: 'cleanupLargeFiles',
                schedule: 'Daily at 2 AM',
                description: '대용량 파일 및 임시 파일 정리',
              },
              {
                name: 'cleanupOldData',
                schedule: 'Weekly on Sunday at 3 AM',
                description: '오래된 데이터 정리 (읽음 영수증, 알림 등)',
              },
              {
                name: 'optimizeCache',
                schedule: 'Every hour',
                description: 'Redis 캐시 최적화 및 만료된 키 정리',
              },
            ],
            requestedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithSystemInfo);
    } catch (error) {
      this.logger.error(
        `Get system info failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 활성 락 상태 조회 API
   * GET /api/v1/scheduler/locks
   */
  @Get('locks')
  async getActiveLocks(@Request() req: any) {
    const user: User = req.user;

    try {
      const activeLocks = await this.schedulerService.getActiveLocks();

      // Return User entity with active locks data
      const userWithLocks = Object.assign(new User(), {
        ...user,
        metadata: {
          activeLocks: {
            count: Object.keys(activeLocks).length,
            locks: Object.entries(activeLocks).map(([taskName, lockValue]) => ({
              taskName,
              lockValue,
              description: this.getTaskDescription(taskName),
              lockedSince: this.extractTimestampFromLock(lockValue),
            })),
            checkedAt: new Date(),
          },
        },
      });

      return crudResponse(userWithLocks);
    } catch (error) {
      this.logger.error(
        `Get active locks failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 캐시 최적화 수동 실행 API (테스트/관리 목적)
   * POST /api/v1/scheduler/optimize-cache
   */
  @Post('optimize-cache')
  async manualOptimizeCache(@Request() req: any) {
    const user: User = req.user;

    try {
      this.logger.log(`Manual cache optimization triggered by user ${user.id}`);

      // 비동기로 실행 (응답은 즉시 반환)
      this.schedulerService.optimizeCache().catch((error) => {
        this.logger.error(`Manual cache optimization failed: ${error.message}`);
      });

      // Return User entity with cache optimization task data
      const userWithOptimizationTask = Object.assign(new User(), {
        ...user,
        metadata: {
          cacheOptimization: {
            taskName: 'optimizeCache',
            triggeredAt: new Date(),
            note: '작업이 백그라운드에서 실행됩니다.',
          },
        },
      });

      return crudResponse(userWithOptimizationTask);
    } catch (error) {
      this.logger.error(
        `Manual cache optimization trigger failed: userId=${user.id}, error=${error.message}`,
      );
      throw error;
    }
  }

  // ==============================
  // Private Helper Methods
  // ==============================

  /**
   * 건강성 점수에 따른 메시지 반환
   */
  private getHealthMessage(score: number): string {
    if (score >= 90) return '시스템이 정상 작동 중입니다.';
    if (score >= 80) return '시스템이 양호한 상태입니다.';
    if (score >= 60) return '시스템에 주의가 필요합니다.';
    if (score >= 40) return '시스템 상태가 좋지 않습니다.';
    return '시스템에 즉시 조치가 필요합니다.';
  }

  /**
   * 건강성 개선 권장사항 반환
   */
  private getHealthRecommendations(
    score: number,
    recentFailures: number,
    timeSinceLastTask: number,
  ): string[] {
    const recommendations: string[] = [];

    if (recentFailures > 3) {
      recommendations.push('최근 작업 실패가 많습니다. 로그를 확인하세요.');
    }

    if (timeSinceLastTask > 86400000) {
      recommendations.push(
        '24시간 이상 작업이 실행되지 않았습니다. 스케줄러 상태를 확인하세요.',
      );
    }

    if (score < 60) {
      recommendations.push(
        '시스템 리소스 및 데이터베이스 연결 상태를 점검하세요.',
      );
    }

    if (score < 40) {
      recommendations.push('즉시 시스템 관리자에게 연락하세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('시스템이 정상 작동 중입니다.');
    }

    return recommendations;
  }

  /**
   * 작업 이름에 따른 설명 반환
   */
  private getTaskDescription(taskName: string): string {
    const descriptions: Record<string, string> = {
      processExpiredTravels: 'Travel 만료 처리 및 Planet 비활성화',
      sendExpiryWarnings: 'Travel 만료 경고 알림 전송',
      cleanupLargeFiles: '대용량 파일 및 임시 파일 정리',
      cleanupOldData: '오래된 데이터 정리 (읽음 영수증, 알림 등)',
      optimizeCache: 'Redis 캐시 최적화 및 만료된 키 정리',
      collectDailyAnalytics: '일일 분석 데이터 수집',
    };

    return descriptions[taskName] || '스케줄링 작업';
  }

  /**
   * 락 값에서 타임스탬프 추출
   */
  private extractTimestampFromLock(lockValue: string): Date | null {
    try {
      // 락 값 형식: ${process.pid}_${Date.now()}_${Math.random()}
      const parts = lockValue.split('_');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[1], 10);
        if (!isNaN(timestamp)) {
          return new Date(timestamp);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
