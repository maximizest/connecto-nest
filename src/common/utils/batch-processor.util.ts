import { SmartBatchProcessor } from '@foryourdev/nestjs-crud';
import { Repository } from 'typeorm';

/**
 * 대용량 데이터 배치 처리 유틸리티
 * @foryourdev/nestjs-crud의 SmartBatchProcessor를 활용
 */
export class BatchProcessorUtil {
  /**
   * 대용량 파일 업로드 배치 처리
   */
  static async bulkCreateWithRetry<T>(
    repository: Repository<T>,
    data: Partial<T>[],
    options?: {
      batchSize?: number;
      maxRetries?: number;
      onProgress?: (progress: number) => void;
    },
  ): Promise<T[]> {
    const processor = new SmartBatchProcessor(repository);
    
    const result = await processor
      .setBatchSize(options?.batchSize || 100)
      .setRetryPolicy({ 
        maxRetries: options?.maxRetries || 3, 
        backoff: 'exponential' 
      })
      .enableProgressTracking(options?.onProgress)
      .process(data, 'create');
      
    return result;
  }

  /**
   * 대용량 업데이트 배치 처리
   */
  static async bulkUpdateWithRetry<T>(
    repository: Repository<T>,
    updates: Array<{ id: number; data: Partial<T> }>,
    options?: {
      batchSize?: number;
      maxRetries?: number;
      onProgress?: (progress: number) => void;
    },
  ): Promise<T[]> {
    const processor = new SmartBatchProcessor(repository);
    
    const result = await processor
      .setBatchSize(options?.batchSize || 50)
      .setRetryPolicy({ 
        maxRetries: options?.maxRetries || 3, 
        backoff: 'exponential' 
      })
      .enableProgressTracking(options?.onProgress)
      .processUpdates(updates);
      
    return result;
  }

  /**
   * 대용량 삭제 배치 처리
   */
  static async bulkDeleteWithRetry<T>(
    repository: Repository<T>,
    ids: number[],
    options?: {
      batchSize?: number;
      maxRetries?: number;
      softDelete?: boolean;
      onProgress?: (progress: number) => void;
    },
  ): Promise<void> {
    const processor = new SmartBatchProcessor(repository);
    
    await processor
      .setBatchSize(options?.batchSize || 200)
      .setRetryPolicy({ 
        maxRetries: options?.maxRetries || 3, 
        backoff: 'exponential' 
      })
      .enableProgressTracking(options?.onProgress)
      .setSoftDelete(options?.softDelete || false)
      .processDeletes(ids);
  }
}