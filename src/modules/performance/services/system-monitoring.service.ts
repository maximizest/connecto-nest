import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as os from 'os';
import { PerformanceService } from '../performance.service';

interface SystemStats {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    connections: number;
  };
}

/**
 * 시스템 모니터링 서비스
 *
 * 시스템 리소스 사용량을 주기적으로 수집하고 성능 메트릭으로 기록합니다.
 */
@Injectable()
export class SystemMonitoringService {
  private readonly logger = new Logger(SystemMonitoringService.name);
  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private isMonitoring = false;

  constructor(
    private readonly performanceService: PerformanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('🖥️ System monitoring service initialized');
  }

  /**
   * 시스템 모니터링 시작
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('System monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.log('System monitoring started');
  }

  /**
   * 시스템 모니터링 중지
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.logger.log('System monitoring stopped');
  }

  /**
   * 매분마다 시스템 통계 수집
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemStats(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      const stats = await this.getSystemStats();
      await this.recordSystemMetrics(stats);

      // 임계값 초과 시 이벤트 발행
      this.checkSystemThresholds(stats);
    } catch (error) {
      this.logger.error(
        `Failed to collect system stats: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 5분마다 상세 시스템 분석
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performDetailedAnalysis(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      const stats = await this.getDetailedSystemStats();
      await this.analyzeSystemPerformance(stats);
    } catch (error) {
      this.logger.error(
        `Failed to perform detailed analysis: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 시간마다 시스템 최적화 제안
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generateOptimizationSuggestions(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      const suggestions = await this.getOptimizationSuggestions();

      if (suggestions.length > 0) {
        this.eventEmitter.emit('system.optimization.suggestions', {
          suggestions,
          timestamp: new Date(),
        });

        this.logger.log(
          `Generated ${suggestions.length} optimization suggestions`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate optimization suggestions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 현재 시스템 통계 조회
   */
  async getCurrentSystemStats(): Promise<SystemStats> {
    return await this.getSystemStats();
  }

  /**
   * 시스템 통계 수집
   */
  private async getSystemStats(): Promise<SystemStats> {
    const memoryStats = await this.getMemoryStats();
    const cpuStats = await this.getCpuStats();
    const diskStats = await this.getDiskStats();
    const networkStats = await this.getNetworkStats();

    return {
      memory: memoryStats,
      cpu: cpuStats,
      disk: diskStats,
      network: networkStats,
    };
  }

  /**
   * 메모리 통계 수집
   */
  private async getMemoryStats(): Promise<SystemStats['memory']> {
    try {
      const memInfo = process.memoryUsage();
      const systemMem = {
        total: os.totalmem(),
        free: os.freemem(),
      };

      const used = systemMem.total - systemMem.free;
      const percentage = (used / systemMem.total) * 100;

      return {
        used: used / (1024 * 1024 * 1024), // GB 단위
        total: systemMem.total / (1024 * 1024 * 1024), // GB 단위
        percentage: Math.round(percentage * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to get memory stats: ${error.message}`);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * CPU 통계 수집
   */
  private async getCpuStats(): Promise<SystemStats['cpu']> {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // CPU 사용률 계산 (간단한 방법)
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (100 * idle) / total;

      return {
        usage: Math.round(usage * 100) / 100,
        loadAverage,
      };
    } catch (error) {
      this.logger.error(`Failed to get CPU stats: ${error.message}`);
      return { usage: 0, loadAverage: [0, 0, 0] };
    }
  }

  /**
   * 디스크 통계 수집
   */
  private async getDiskStats(): Promise<SystemStats['disk']> {
    try {
      // Node.js에서 직접적인 디스크 사용량을 얻기는 어려우므로
      // 간단한 방법으로 프로세스의 cwd 기준으로 추정
      const stats = await fs.stat(process.cwd());

      // 실제로는 더 정확한 디스크 사용량 조회 필요
      // 여기서는 임시로 고정값 반환
      return {
        used: 50, // GB
        total: 100, // GB
        percentage: 50,
      };
    } catch (error) {
      this.logger.error(`Failed to get disk stats: ${error.message}`);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * 네트워크 통계 수집
   */
  private async getNetworkStats(): Promise<SystemStats['network']> {
    try {
      // 네트워크 연결 수는 OS별로 다른 방법이 필요하므로
      // 여기서는 간단히 추정값 반환
      return {
        connections: 100, // 임시값
      };
    } catch (error) {
      this.logger.error(`Failed to get network stats: ${error.message}`);
      return { connections: 0 };
    }
  }

  /**
   * 상세 시스템 통계 수집
   */
  private async getDetailedSystemStats(): Promise<any> {
    const basicStats = await this.getSystemStats();

    return {
      ...basicStats,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        memory: process.memoryUsage(),
      },
      os: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
      },
    };
  }

  /**
   * 시스템 메트릭 기록
   */
  private async recordSystemMetrics(stats: SystemStats): Promise<void> {
    try {
      // 메모리, CPU, 디스크 사용률을 성능 메트릭으로 기록
      await this.performanceService.recordSystemUsage(
        stats.memory.percentage,
        stats.cpu.usage,
        stats.disk.percentage,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record system metrics: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 시스템 임계값 검사
   */
  private checkSystemThresholds(stats: SystemStats): void {
    // 메모리 사용량 90% 초과
    if (stats.memory.percentage > 90) {
      this.eventEmitter.emit('system.alert.memory.high', {
        usage: stats.memory.percentage,
        used: stats.memory.used,
        total: stats.memory.total,
      });
    }

    // CPU 사용량 95% 초과
    if (stats.cpu.usage > 95) {
      this.eventEmitter.emit('system.alert.cpu.high', {
        usage: stats.cpu.usage,
        loadAverage: stats.cpu.loadAverage,
      });
    }

    // 디스크 사용량 90% 초과
    if (stats.disk.percentage > 90) {
      this.eventEmitter.emit('system.alert.disk.high', {
        usage: stats.disk.percentage,
        used: stats.disk.used,
        total: stats.disk.total,
      });
    }
  }

  /**
   * 시스템 성능 분석
   */
  private async analyzeSystemPerformance(detailedStats: any): Promise<void> {
    try {
      const analysis = {
        memoryTrend: this.analyzeMemoryTrend(detailedStats),
        cpuTrend: this.analyzeCpuTrend(detailedStats),
        overallHealth: this.calculateOverallHealth(detailedStats),
      };

      this.eventEmitter.emit('system.analysis.completed', {
        analysis,
        stats: detailedStats,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to analyze system performance: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 메모리 트렌드 분석
   */
  private analyzeMemoryTrend(stats: any): string {
    const memUsage = stats.memory.percentage;

    if (memUsage < 50) return 'optimal';
    if (memUsage < 70) return 'normal';
    if (memUsage < 85) return 'caution';
    return 'critical';
  }

  /**
   * CPU 트렌드 분석
   */
  private analyzeCpuTrend(stats: any): string {
    const cpuUsage = stats.cpu.usage;

    if (cpuUsage < 30) return 'optimal';
    if (cpuUsage < 60) return 'normal';
    if (cpuUsage < 80) return 'caution';
    return 'critical';
  }

  /**
   * 전체 시스템 건강도 계산
   */
  private calculateOverallHealth(stats: any): number {
    const memoryScore = Math.max(0, 100 - stats.memory.percentage);
    const cpuScore = Math.max(0, 100 - stats.cpu.usage);
    const diskScore = Math.max(0, 100 - stats.disk.percentage);

    return Math.round((memoryScore + cpuScore + diskScore) / 3);
  }

  /**
   * 최적화 제안 생성
   */
  private async getOptimizationSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];
    const stats = await this.getSystemStats();

    if (stats.memory.percentage > 80) {
      suggestions.push(
        '메모리 사용량이 높습니다. 메모리 캐시 크기를 조정하거나 가비지 컬렉션 튜닝을 고려해보세요.',
      );
    }

    if (stats.cpu.usage > 70) {
      suggestions.push(
        'CPU 사용량이 높습니다. 비동기 처리 최적화나 백그라운드 작업 스케줄링을 검토해보세요.',
      );
    }

    if (stats.disk.percentage > 85) {
      suggestions.push(
        '디스크 사용량이 높습니다. 오래된 로그 파일이나 임시 파일 정리를 고려해보세요.',
      );
    }

    if (stats.cpu.loadAverage[0] > os.cpus().length * 2) {
      suggestions.push(
        '시스템 부하가 높습니다. 워커 프로세스 수를 조정하거나 로드 밸런싱을 검토해보세요.',
      );
    }

    return suggestions;
  }
}
