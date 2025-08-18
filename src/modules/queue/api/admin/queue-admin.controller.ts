import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../../guards/admin.guard';
import { QueueService } from '../../queue.service';

/**
 * Queue Admin Controller
 *
 * BullMQ 큐 관리 및 모니터링을 위한 관리자 전용 API
 * Bull Board는 /admin/queues 경로에서 별도로 제공됨
 */
@Controller({ path: 'admin/queue', version: '1' })
@UseGuards(AdminGuard)
export class QueueAdminController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * 큐 통계 조회
   */
  @Get('stats')
  async getQueueStats() {
    return await this.queueService.getQueueStats();
  }

  /**
   * 특정 작업 상태 조회
   */
  @Get(':queueName/job/:jobId')
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return await this.queueService.getJobStatus(queueName, jobId);
  }

  /**
   * 파일 정리 작업 수동 트리거
   */
  @Post('file-cleanup/trigger')
  async triggerFileCleanup(@Body('type') type: 'large' | 'failed' = 'large') {
    const job = await this.queueService.triggerFileCleanup(type);
    return {
      success: true,
      jobId: job.id,
      jobName: job.name,
      message: `File cleanup job ${job.id} has been queued`,
    };
  }

  /**
   * Travel 정리 작업 수동 트리거
   */
  @Post('travel-cleanup/trigger')
  async triggerTravelCleanup() {
    const job = await this.queueService.triggerTravelCleanup();
    return {
      success: true,
      jobId: job.id,
      jobName: job.name,
      message: `Travel cleanup job ${job.id} has been queued`,
    };
  }

  /**
   * 캐시 정리 작업 수동 트리거
   */
  @Post('cache-cleanup/trigger')
  async triggerCacheCleanup() {
    const job = await this.queueService.triggerCacheCleanup();
    return {
      success: true,
      jobId: job.id,
      jobName: job.name,
      message: `Cache cleanup job ${job.id} has been queued`,
    };
  }
}
