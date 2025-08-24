import { Repository, ObjectLiteral } from 'typeorm';

/**
 * 대용량 데이터 배치 처리 유틸리티
 * TypeORM의 기본 배치 처리 기능 활용
 */
export class BatchProcessorUtil {
  /**
   * 대용량 파일 업로드 배치 처리
   */
  static async bulkCreateWithRetry<T extends ObjectLiteral>(
    repository: Repository<T>,
    data: Partial<T>[],
    options?: {
      batchSize?: number;
      maxRetries?: number;
      onProgress?: (progress: number) => void;
    },
  ): Promise<T[]> {
    const batchSize = options?.batchSize || 100;
    const maxRetries = options?.maxRetries || 3;
    const results: T[] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const batchResult = await repository.save(batch as T[]);
          results.push(...batchResult);
          
          if (options?.onProgress) {
            options.onProgress(Math.min(100, ((i + batch.length) / data.length) * 100));
          }
          break;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }
    
    return results;
  }

  /**
   * 대용량 업데이트 배치 처리
   */
  static async bulkUpdateWithRetry<T extends ObjectLiteral>(
    repository: Repository<T>,
    updates: Array<{ id: number; data: Partial<T> }>,
    options?: {
      batchSize?: number;
      maxRetries?: number;
      onProgress?: (progress: number) => void;
    },
  ): Promise<T[]> {
    const batchSize = options?.batchSize || 50;
    const maxRetries = options?.maxRetries || 3;
    const results: T[] = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          for (const update of batch) {
            const result = await repository.update(update.id, update.data);
            if (result.affected) {
              const updated = await repository.findOne({ where: { id: update.id } as any });
              if (updated) results.push(updated);
            }
          }
          
          if (options?.onProgress) {
            options.onProgress(Math.min(100, ((i + batch.length) / updates.length) * 100));
          }
          break;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }
    
    return results;
  }

  /**
   * 대용량 삭제 배치 처리
   */
  static async bulkDeleteWithRetry<T extends ObjectLiteral>(
    repository: Repository<T>,
    ids: number[],
    options?: {
      batchSize?: number;
      maxRetries?: number;
      softDelete?: boolean;
      onProgress?: (progress: number) => void;
    },
  ): Promise<void> {
    const batchSize = options?.batchSize || 200;
    const maxRetries = options?.maxRetries || 3;
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          if (options?.softDelete) {
            await repository.softDelete(batch);
          } else {
            await repository.delete(batch);
          }
          
          if (options?.onProgress) {
            options.onProgress(Math.min(100, ((i + batch.length) / ids.length) * 100));
          }
          break;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }
  }
}