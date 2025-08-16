/**
 * 스케줄링 작업 통계
 */
export interface SchedulerStats {
  taskName: string;
  lastRunAt: Date;
  nextRunAt?: Date;
  status: 'success' | 'failed' | 'running';
  processedItems: number;
  duration: number; // milliseconds
  errorMessage?: string;
  metrics: Record<string, any>;
}
